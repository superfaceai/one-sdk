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

    /// Calculate how many bytes we need to drain until `needed` bytes fit in the buffer.
    ///
    /// If `needed` is less than `self.free_len()` then `0` is returned.
    ///
    /// This attempts to align the len to event separators. Once all previous events are exhaused
    /// and there still isn't enough room for the new data we truncate the current in-progress event from the left.
    fn drain_len_for(&self, needed: usize) -> usize {
        let needed = needed.saturating_sub(self.free_len());
        if needed == 0 {
            return 0;
        }

        // go over the slices, if we find event separator that covers enough bytes to make room for `needed` then we return that
        for (i, b) in self.data.iter().enumerate() {
            if *b == EVENT_SEPARATOR {
                if i + 1 >= needed {
                    return i + 1;
                }
            }
        }
        // otherwise we must drain all events plus some more data from the current in-progress event
        // this is basically `needed` clamped to the size of existing data
        needed.min(self.data.len())
    }
}
impl TracingEventBuffer for RingEventBuffer {
    fn write(&mut self, mut data: &[u8]) {
        // if data is longer than internal capacity we only retain the last bytes of the input
        if data.len() > self.data.capacity() {
            data = &data[data.len() - self.data.capacity()..];
        }

        // pop as many events as needed to make room for this new data
        match self.drain_len_for(data.len()) {
            0 => (),
            n => {
                let _ = self.data.drain(0..n);
            }
        }

        self.data.extend(data.iter().copied());
    }

    fn as_raw_parts(&self) -> [(*const u8, usize); 2] {
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
        assert!(buffer.data.as_slices().0.is_empty());
        assert!(buffer.data.as_slices().1.is_empty());
        assert_eq!(buffer.as_raw_parts()[0].1, 0);
        assert_eq!(buffer.as_raw_parts()[1].1, 0);

        buffer.write(&[10, 11, 12, 0]);
        buffer.write(&[13, 14, 15, 0]);

        assert_eq!(buffer.data.as_slices().0, &[10, 11, 12, 0, 13, 14, 15, 0]);
        assert_eq!(buffer.as_raw_parts()[0].1, 8);
        assert_eq!(buffer.as_raw_parts()[1].1, 0);

        buffer.write(&[16, 17, 18, 0]);
        buffer.write(&[19, 0]);
        assert_eq!(buffer.data.as_slices().0, &[13, 14, 15, 0, 16, 17]);
        assert_eq!(buffer.data.as_slices().1, &[18, 0, 19, 0]);
        assert_eq!(buffer.as_raw_parts()[0].1, 6);
        assert_eq!(buffer.as_raw_parts()[1].1, 4);
    }

    #[test]
    fn test_ring_buffer_split_write_overflow() {
        let mut buffer = RingEventBuffer::new(5);
        for b in [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] {
            buffer.write(&[b]);
        }
        assert_eq!(buffer.free_len(), 0);
        assert_eq!(buffer.data.as_slices().0, &[6, 7, 8, 9, 0]);
    }
}
