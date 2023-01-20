
#[allow(clippy::all)]
pub mod sf_unstable{
  #[allow(unused_imports)]
  use wit_bindgen_guest_rust::rt::{alloc, vec::Vec, string::String};
  
  #[derive(Clone)]
  pub struct HttpHeaderEntryParam<'a,> {
    pub key: &'a str,
    pub value: &'a str,
  }
  impl<'a,> core::fmt::Debug for HttpHeaderEntryParam<'a,> {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
      f.debug_struct("HttpHeaderEntryParam").field("key", &self.key).field("value", &self.value).finish()
    }
  }
  #[derive(Clone)]
  pub struct HttpHeaderEntryResult {
    pub key: String,
    pub value: String,
  }
  impl core::fmt::Debug for HttpHeaderEntryResult {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
      f.debug_struct("HttpHeaderEntryResult").field("key", &self.key).field("value", &self.value).finish()
    }
  }
  pub fn abort() -> (){
    unsafe {
      
      #[link(wasm_import_module = "sf-unstable")]
      extern "C" {
        #[cfg_attr(target_arch = "wasm32", link_name = "abort")]
        #[cfg_attr(not(target_arch = "wasm32"), link_name = "sf-unstable_abort")]
        fn wit_import(
        );
      }
      wit_import();
    }
  }
  pub fn http_get(url: &str,headers: &[HttpHeaderEntryParam<'_,>],) -> u32{
    unsafe {
      let vec0 = url;
      let ptr0 = vec0.as_ptr() as i32;
      let len0 = vec0.len() as i32;
      let vec4 = headers;
      let len4 = vec4.len() as i32;
      let layout4 = alloc::Layout::from_size_align_unchecked(vec4.len() * 16, 4);
      let result4 = if layout4.size() != 0
      {
        let ptr = alloc::alloc(layout4);
        if ptr.is_null()
        {
          alloc::handle_alloc_error(layout4);
        }
        ptr
      }else {
        core::ptr::null_mut()
      };
      for (i, e) in vec4.into_iter().enumerate() {
        let base = result4 as i32 + (i as i32) * 16;
        {
          let HttpHeaderEntryParam{ key:key1, value:value1, } = e;
          let vec2 = key1;
          let ptr2 = vec2.as_ptr() as i32;
          let len2 = vec2.len() as i32;
          *((base + 4) as *mut i32) = len2;
          *((base + 0) as *mut i32) = ptr2;
          let vec3 = value1;
          let ptr3 = vec3.as_ptr() as i32;
          let len3 = vec3.len() as i32;
          *((base + 12) as *mut i32) = len3;
          *((base + 8) as *mut i32) = ptr3;
          
        }}
        
        #[link(wasm_import_module = "sf-unstable")]
        extern "C" {
          #[cfg_attr(target_arch = "wasm32", link_name = "http-get")]
          #[cfg_attr(not(target_arch = "wasm32"), link_name = "sf-unstable_http-get")]
          fn wit_import(
          _: i32, _: i32, _: i32, _: i32, ) -> i32;
        }
        let ret = wit_import(ptr0, len0, result4 as i32, len4);
        if layout4.size() != 0 {
          alloc::dealloc(result4, layout4);
        }
        ret as u32
      }
    }
    pub fn http_response_headers(handle: u32,) -> Vec<HttpHeaderEntryResult>{
      unsafe {
        
        #[repr(align(4))]
        struct RetArea([u8; 8]);
        let mut ret_area = core::mem::MaybeUninit::<RetArea>::uninit();
        let ptr0= ret_area.as_mut_ptr() as i32;
        
        #[link(wasm_import_module = "sf-unstable")]
        extern "C" {
          #[cfg_attr(target_arch = "wasm32", link_name = "http-response-headers")]
          #[cfg_attr(not(target_arch = "wasm32"), link_name = "sf-unstable_http-response-headers")]
          fn wit_import(
          _: i32, _: i32, );
        }
        wit_import(wit_bindgen_guest_rust::rt::as_i32(handle), ptr0);
        let base3 = *((ptr0 + 0) as *const i32);
        let len3 = *((ptr0 + 4) as *const i32);
        let mut result3 = Vec::with_capacity(len3 as usize);
        for i in 0..len3 {
          let base = base3 + i *16;
          result3.push({
            let len1 = *((base + 4) as *const i32) as usize;
            let len2 = *((base + 12) as *const i32) as usize;
            
            HttpHeaderEntryResult{key:String::from_utf8(Vec::from_raw_parts(*((base + 0) as *const i32) as *mut _, len1, len1)).unwrap(), value:String::from_utf8(Vec::from_raw_parts(*((base + 8) as *const i32) as *mut _, len2, len2)).unwrap(), }
          });
        }
        wit_bindgen_guest_rust::rt::dealloc(base3, (len3 as usize) * 16, 4);
        result3
      }
    }
    pub fn http_response_read(handle: u32,out: &[u8],) -> u32{
      unsafe {
        let vec0 = out;
        let ptr0 = vec0.as_ptr() as i32;
        let len0 = vec0.len() as i32;
        
        #[link(wasm_import_module = "sf-unstable")]
        extern "C" {
          #[cfg_attr(target_arch = "wasm32", link_name = "http-response-read")]
          #[cfg_attr(not(target_arch = "wasm32"), link_name = "sf-unstable_http-response-read")]
          fn wit_import(
          _: i32, _: i32, _: i32, ) -> i32;
        }
        let ret = wit_import(wit_bindgen_guest_rust::rt::as_i32(handle), ptr0, len0);
        ret as u32
      }
    }
    
  }
  
  
  #[allow(clippy::all)]
  pub mod sf_unstable_exp{
    #[allow(unused_imports)]
    use wit_bindgen_guest_rust::rt::{alloc, vec::Vec, string::String};
    
    #[derive(Clone)]
    pub struct HttpHeaderEntry {
      pub key: String,
      pub value: String,
    }
    impl core::fmt::Debug for HttpHeaderEntry {
      fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.debug_struct("HttpHeaderEntry").field("key", &self.key).field("value", &self.value).finish()
      }
    }
    pub trait SfUnstableExp {
      fn abort() -> ();
      fn http_get(url: String,headers: Vec<HttpHeaderEntry>,) -> u32;
      fn http_response_headers(handle: u32,) -> Vec<HttpHeaderEntry>;
      fn http_response_read(handle: u32,out: Vec<u8>,) -> u32;
    }
    
    #[doc(hidden)]
    pub unsafe fn call_abort<T: SfUnstableExp>() {
      T::abort();
    }
    
    #[doc(hidden)]
    pub unsafe fn call_http_get<T: SfUnstableExp>(arg0: i32,arg1: i32,arg2: i32,arg3: i32,) -> i32 {
      let len0 = arg1 as usize;
      let base3 = arg2;
      let len3 = arg3;
      let mut result3 = Vec::with_capacity(len3 as usize);
      for i in 0..len3 {
        let base = base3 + i *16;
        result3.push({
          let len1 = *((base + 4) as *const i32) as usize;
          let len2 = *((base + 12) as *const i32) as usize;
          
          HttpHeaderEntry{key:String::from_utf8(Vec::from_raw_parts(*((base + 0) as *const i32) as *mut _, len1, len1)).unwrap(), value:String::from_utf8(Vec::from_raw_parts(*((base + 8) as *const i32) as *mut _, len2, len2)).unwrap(), }
        });
      }
      wit_bindgen_guest_rust::rt::dealloc(base3, (len3 as usize) * 16, 4);
      let result4 = T::http_get(String::from_utf8(Vec::from_raw_parts(arg0 as *mut _, len0, len0)).unwrap(), result3);
      wit_bindgen_guest_rust::rt::as_i32(result4)
    }
    
    #[doc(hidden)]
    pub unsafe fn call_http_response_headers<T: SfUnstableExp>(arg0: i32,) -> i32 {
      let result0 = T::http_response_headers(arg0 as u32);
      let ptr1 = RET_AREA.0.as_mut_ptr() as i32;
      let vec5 = result0;
      let len5 = vec5.len() as i32;
      let layout5 = alloc::Layout::from_size_align_unchecked(vec5.len() * 16, 4);
      let result5 = if layout5.size() != 0
      {
        let ptr = alloc::alloc(layout5);
        if ptr.is_null()
        {
          alloc::handle_alloc_error(layout5);
        }
        ptr
      }else {
        core::ptr::null_mut()
      };
      for (i, e) in vec5.into_iter().enumerate() {
        let base = result5 as i32 + (i as i32) * 16;
        {
          let HttpHeaderEntry{ key:key2, value:value2, } = e;
          let vec3 = (key2.into_bytes()).into_boxed_slice();
          let ptr3 = vec3.as_ptr() as i32;
          let len3 = vec3.len() as i32;
          core::mem::forget(vec3);
          *((base + 4) as *mut i32) = len3;
          *((base + 0) as *mut i32) = ptr3;
          let vec4 = (value2.into_bytes()).into_boxed_slice();
          let ptr4 = vec4.as_ptr() as i32;
          let len4 = vec4.len() as i32;
          core::mem::forget(vec4);
          *((base + 12) as *mut i32) = len4;
          *((base + 8) as *mut i32) = ptr4;
          
        }}
        *((ptr1 + 4) as *mut i32) = len5;
        *((ptr1 + 0) as *mut i32) = result5 as i32;
        ptr1
      }
      
      #[doc(hidden)]
      pub unsafe fn post_return_http_response_headers<T: SfUnstableExp>(arg0: i32,) {
        let base0 = *((arg0 + 0) as *const i32);
        let len0 = *((arg0 + 4) as *const i32);
        for i in 0..len0 {
          let base = base0 + i *16;
          {
            wit_bindgen_guest_rust::rt::dealloc(*((base + 0) as *const i32), (*((base + 4) as *const i32)) as usize, 1);
            wit_bindgen_guest_rust::rt::dealloc(*((base + 8) as *const i32), (*((base + 12) as *const i32)) as usize, 1);
            
          }
        }
        wit_bindgen_guest_rust::rt::dealloc(base0, (len0 as usize) * 16, 4);
      }
      
      #[doc(hidden)]
      pub unsafe fn call_http_response_read<T: SfUnstableExp>(arg0: i32,arg1: i32,arg2: i32,) -> i32 {
        let len0 = arg2 as usize;
        let result1 = T::http_response_read(arg0 as u32, Vec::from_raw_parts(arg1 as *mut _, len0, len0));
        wit_bindgen_guest_rust::rt::as_i32(result1)
      }
      
      #[repr(align(4))]
      struct SfUnstableExpRetArea([u8; 8]);
      static mut RET_AREA: SfUnstableExpRetArea = SfUnstableExpRetArea([0; 8]);
      
    }
    
    
    /// Declares the export of the component's world for the
    /// given type.
    
    macro_rules! export_core(($t:ident) => {
      const _: () = {
        
        #[doc(hidden)]
        #[export_name = "sf-unstable-exp#abort"]
        #[allow(non_snake_case)]
        unsafe extern "C" fn __export_host_to_core_unstable_abort() {
          sf_unstable_exp::call_abort::<$t>()
        }
        
        #[doc(hidden)]
        #[export_name = "sf-unstable-exp#http-get"]
        #[allow(non_snake_case)]
        unsafe extern "C" fn __export_host_to_core_unstable_http_get(arg0: i32,arg1: i32,arg2: i32,arg3: i32,) -> i32 {
          sf_unstable_exp::call_http_get::<$t>(arg0,arg1,arg2,arg3,)
        }
        
        #[doc(hidden)]
        #[export_name = "sf-unstable-exp#http-response-headers"]
        #[allow(non_snake_case)]
        unsafe extern "C" fn __export_host_to_core_unstable_http_response_headers(arg0: i32,) -> i32 {
          sf_unstable_exp::call_http_response_headers::<$t>(arg0,)
        }
        
        #[doc(hidden)]
        #[export_name = "cabi_post_sf-unstable-exp#http-response-headers"]
        #[allow(non_snake_case)]
        unsafe extern "C" fn __post_return_host_to_core_unstable_http_response_headers(arg0: i32,) {
          sf_unstable_exp::post_return_http_response_headers::<$t>(arg0,)
        }
        
        #[doc(hidden)]
        #[export_name = "sf-unstable-exp#http-response-read"]
        #[allow(non_snake_case)]
        unsafe extern "C" fn __export_host_to_core_unstable_http_response_read(arg0: i32,arg1: i32,arg2: i32,) -> i32 {
          sf_unstable_exp::call_http_response_read::<$t>(arg0,arg1,arg2,)
        }
        
      };
      
      #[used]
      #[doc(hidden)]
      #[cfg(target_arch = "wasm32")]
      static __FORCE_SECTION_REF: fn() = __force_section_ref;
      #[doc(hidden)]
      #[cfg(target_arch = "wasm32")]
      fn __force_section_ref() {
        __link_section()
      }
    });
    
    #[cfg(target_arch = "wasm32")]
    #[link_section = "component-type:core"]
    pub static __WIT_BINDGEN_COMPONENT_TYPE: [u8; 372] = [1, 0, 4, 99, 111, 114, 101, 0, 97, 115, 109, 10, 0, 1, 0, 7, 186, 2, 9, 64, 0, 1, 0, 114, 2, 3, 107, 101, 121, 115, 5, 118, 97, 108, 117, 101, 115, 112, 1, 64, 2, 3, 117, 114, 108, 115, 7, 104, 101, 97, 100, 101, 114, 115, 2, 0, 121, 64, 1, 6, 104, 97, 110, 100, 108, 101, 121, 0, 2, 112, 125, 64, 2, 6, 104, 97, 110, 100, 108, 101, 121, 3, 111, 117, 116, 5, 0, 121, 66, 10, 2, 3, 2, 1, 1, 4, 17, 104, 116, 116, 112, 45, 104, 101, 97, 100, 101, 114, 45, 101, 110, 116, 114, 121, 0, 3, 0, 0, 2, 3, 2, 1, 0, 4, 5, 97, 98, 111, 114, 116, 0, 1, 1, 2, 3, 2, 1, 3, 4, 8, 104, 116, 116, 112, 45, 103, 101, 116, 0, 1, 2, 2, 3, 2, 1, 4, 4, 21, 104, 116, 116, 112, 45, 114, 101, 115, 112, 111, 110, 115, 101, 45, 104, 101, 97, 100, 101, 114, 115, 0, 1, 3, 2, 3, 2, 1, 6, 4, 18, 104, 116, 116, 112, 45, 114, 101, 115, 112, 111, 110, 115, 101, 45, 114, 101, 97, 100, 0, 1, 4, 66, 10, 2, 3, 2, 1, 1, 4, 17, 104, 116, 116, 112, 45, 104, 101, 97, 100, 101, 114, 45, 101, 110, 116, 114, 121, 0, 3, 0, 0, 2, 3, 2, 1, 0, 4, 5, 97, 98, 111, 114, 116, 0, 1, 1, 2, 3, 2, 1, 3, 4, 8, 104, 116, 116, 112, 45, 103, 101, 116, 0, 1, 2, 2, 3, 2, 1, 4, 4, 21, 104, 116, 116, 112, 45, 114, 101, 115, 112, 111, 110, 115, 101, 45, 104, 101, 97, 100, 101, 114, 115, 0, 1, 3, 2, 3, 2, 1, 6, 4, 18, 104, 116, 116, 112, 45, 114, 101, 115, 112, 111, 110, 115, 101, 45, 114, 101, 97, 100, 0, 1, 4, 10, 16, 1, 11, 115, 102, 45, 117, 110, 115, 116, 97, 98, 108, 101, 0, 5, 7, 11, 20, 1, 15, 115, 102, 45, 117, 110, 115, 116, 97, 98, 108, 101, 45, 101, 120, 112, 0, 3, 8];
    
    #[inline(never)]
    #[doc(hidden)]
    #[cfg(target_arch = "wasm32")]
    pub fn __link_section() {}
    