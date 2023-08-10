use crate::HeadersMultiMap;

pub struct AltDebug<T: std::fmt::Debug>(pub T);
impl<T: std::fmt::Debug> std::fmt::Debug for AltDebug<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:#?}", self.0)
    }
}

pub struct HttpHeadersFmt<'a>(pub &'a HeadersMultiMap);
impl<'a> std::fmt::Debug for HttpHeadersFmt<'a> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for (key, values) in self.0 {
            for value in values {
                writeln!(f, "{}: {}", key, value)?;
            }
        }
        Ok(())
    }
}

pub struct HttpBodyFmt<'a>(pub &'a [u8]);
impl<'a> std::fmt::Debug for HttpBodyFmt<'a> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match std::str::from_utf8(self.0) {
            Ok(s) => write!(f, "{}", s),
            Err(_) => write!(f, "{:?}", self.0),
        }
    }
}

pub struct HttpRequestFmt<'a> {
    pub method: &'a str,
    pub url: &'a str,
    pub headers: &'a HeadersMultiMap,
    pub body: &'a [u8],
}
impl<'a> std::fmt::Debug for HttpRequestFmt<'a> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // GET / HTTP/1.1
        // Header: value
        // Header: value
        //
        // body
        writeln!(f, "{} {} HTTP", self.method, self.url)?;
        write!(f, "{:?}", HttpHeadersFmt(self.headers))?;
        writeln!(f)?;
        write!(f, "{:?}", HttpBodyFmt(self.body))?;
        writeln!(f)?;

        Ok(())
    }
}

pub struct HttpResponseFmt<'a> {
    pub status: u16,
    pub headers: &'a HeadersMultiMap,
    pub body: &'a [u8],
}
impl<'a> std::fmt::Debug for HttpResponseFmt<'a> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // HTTP/1.1 200 OK
        // Header: value
        // Header: value
        //
        // body
        writeln!(f, "HTTP {}", self.status)?;
        write!(f, "{:?}", HttpHeadersFmt(self.headers))?;
        writeln!(f)?;
        write!(f, "{:?}", HttpBodyFmt(self.body))?;
        writeln!(f)?;

        Ok(())
    }
}
