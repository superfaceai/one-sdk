use slab::Slab;

use sf_std::abi::Handle;

pub struct HandleMap<T> {
    data: Slab<T>,
}
impl<T> Default for HandleMap<T> {
    fn default() -> Self {
        Self::new()
    }
}
impl<T> HandleMap<T> {
    pub fn new() -> Self {
        Self { data: Slab::new() }
    }

    const fn handle_to_index(handle: Handle) -> Option<usize> {
        (handle as usize).checked_sub(1)
    }

    const fn index_to_handle(index: usize) -> Handle {
        (index + 1) as Handle
    }

    pub fn insert(&mut self, value: T) -> Handle {
        Self::index_to_handle(self.data.insert(value))
    }

    pub fn get_mut(&mut self, handle: Handle) -> Option<&mut T> {
        Self::handle_to_index(handle).and_then(|h| self.data.get_mut(h))
    }

    pub fn try_remove(&mut self, handle: Handle) -> Option<T> {
        Self::handle_to_index(handle).and_then(|h| self.data.try_remove(h))
    }
}
