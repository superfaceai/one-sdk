use std::collections::VecDeque;

use super::{TracingEventBuffer, EVENT_SEPARATOR};

pub struct RingEventBuffer {
    data: VecDeque<u8>,
}
impl RingEventBuffer {
    pub fn new(size: usize) -> Self {
        // ensure data.capacity is exactly size
        let mut data = VecDeque::new();
        data.reserve_exact(size);

        Self { data }
    }

    fn free_len(&self) -> usize {
        self.data.capacity() - self.data.len()
    }

    fn pop_event(&mut self) -> impl Iterator<Item = u8> + '_ {
        let (first, second) = self.data.as_slices();

        let event_len = match first.into_iter().position(|&b| b == EVENT_SEPARATOR) {
            Some(i) => i + 1,
            None => match second.into_iter().position(|&b| b == EVENT_SEPARATOR) {
                Some(i) => first.len() + i + 1,
                None => unreachable!(),
            },
        };

        self.data.drain(0..event_len)
    }
}
impl TracingEventBuffer for RingEventBuffer {
    type RawParts = [(*const u8, usize); 2];

    fn write(&mut self, mut data: &[u8]) {
        // if data is longer than internal capacity we only retain the last bytes of the input
        if data.len() > self.data.capacity() {
            data = &data[data.len() - self.data.capacity()..];
        }

        // pop all previous events to make room for this new data
        while data.len() > self.free_len() {
            let _ = self.pop_event();
        }

        self.data.extend(data.into_iter().copied());
    }

    fn as_raw_parts(&self) -> Self::RawParts {
        let (first, second) = self.data.as_slices();

        [
            (first.as_ptr(), first.len()),
            (second.as_ptr(), second.len()),
        ]
    }

    fn clear(&mut self) {
        self.data.clear();
    }
}
impl std::fmt::Debug for RingEventBuffer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "RingEventBuffer(<{} events, {} bytes>)",
            self.data.iter().filter(|&&b| b == EVENT_SEPARATOR).count(),
            self.data.len()
        )
    }
}

#[cfg(test)]
mod test {
    use crate::observability::buffer::TracingEventBuffer;

    use super::RingEventBuffer;

    #[test]
    fn test_ring_buffer_write_simple() {
        let mut buffer = RingEventBuffer::new(10);
        buffer.write(&[10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);

        assert_eq!(
            buffer.data.as_slices().0,
            &[10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
        );
    }

    #[test]
    fn test_ring_buffer_write_wrapping() {
        let mut buffer = RingEventBuffer::new(10);
        buffer.write(&[10, 11, 12, 0]);
        buffer.write(&[13, 14, 15, 0]);

        assert_eq!(buffer.data.as_slices().0, &[10, 11, 12, 0, 13, 14, 15, 0]);
        assert_eq!(buffer.as_raw_parts()[0].1, 8);
        assert_eq!(buffer.as_raw_parts()[1].1, 0);
        assert_eq!(buffer.pop_event().collect::<Vec<_>>(), vec![10, 11, 12, 0]);

        buffer.write(&[16, 17, 18, 0]);
        buffer.write(&[19, 0]);
        assert_eq!(buffer.data.as_slices().0, &[13, 14, 15, 0, 16, 17]);
        assert_eq!(buffer.data.as_slices().1, &[18, 0, 19, 0]);
        assert_eq!(buffer.as_raw_parts()[0].1, 6);
        assert_eq!(buffer.as_raw_parts()[1].1, 4);
        assert_eq!(buffer.pop_event().collect::<Vec<_>>(), vec![13, 14, 15, 0]);
        assert_eq!(buffer.pop_event().collect::<Vec<_>>(), vec![16, 17, 18, 0]);
        assert_eq!(buffer.pop_event().collect::<Vec<_>>(), vec![19, 0]);

        assert!(buffer.data.as_slices().0.is_empty());
        assert!(buffer.data.as_slices().1.is_empty());
        assert_eq!(buffer.as_raw_parts()[0].1, 0);
        assert_eq!(buffer.as_raw_parts()[1].1, 0);
    }
}
