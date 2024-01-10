
use comlink::typescript_parser::{parse_profile, Diagnostic, Profile};

use crate::MessageExchangeFfi;

wasm_abi::define_exchange! {
    struct ParseTsProfileInputRequest {
        kind: "parse-ts-profile-input"
    } -> enum ParseProfileInputResponse {
        Ok { profile: String },
        Err { message: String }
    }
}
wasm_abi::define_exchange! {
    struct ParseTsProfileOutputRequest {
        kind: "parse-ts-profile-output",
        profile: Profile,
        diagnostics: Vec<Diagnostic>
    } -> enum ParseTsProfileOutputResponse {
        Ok,
        Err { message: String }
    }
}

#[no_mangle]
#[export_name = "parse_ts_profile"]
pub extern "C" fn __export_parse_ts_profile() {
    let profile = match ParseTsProfileInputRequest::new()
        .send_json_in(MessageExchangeFfi)
        .unwrap()
    {
        ParseProfileInputResponse::Ok { profile } => profile,
        ParseProfileInputResponse::Err { message } => {
            panic!("parse-ts-profile-input error: {}", message)
        }
    };

    let (profile, diagnostics) = parse_profile(&profile);

    match ParseTsProfileOutputRequest::new(profile, diagnostics)
        .send_json_in(MessageExchangeFfi)
        .unwrap()
    {
        ParseTsProfileOutputResponse::Ok => (),
        ParseTsProfileOutputResponse::Err { message } => {
            panic!("parse-ts-profile-output error: {}", message)
        }
    }
}
