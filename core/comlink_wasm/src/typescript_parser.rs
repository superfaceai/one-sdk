
use comlink::typescript_parser::{parse_profile, Diagnostic, Profile, ProfileSpans, parse_profile_id_from_path};

use crate::MessageExchangeFfi;

wasm_abi::define_exchange! {
    struct ParseTsProfileInputRequest {
        kind: "parse-ts-profile-input"
    } -> enum ParseProfileInputResponse {
        Ok {
            profile: String,
            #[serde(default)]
            file_path: Option<String>
        },
        Err { message: String }
    }
}
wasm_abi::define_exchange! {
    struct ParseTsProfileOutputRequest {
        kind: "parse-ts-profile-output",
        profile: Profile,
        spans: ProfileSpans,
        diagnostics: Vec<Diagnostic>
    } -> enum ParseTsProfileOutputResponse {
        Ok,
        Err { message: String }
    }
}

#[no_mangle]
#[export_name = "parse_ts_profile"]
pub extern "C" fn __export_parse_ts_profile() {
    let (profile, file_path) = match ParseTsProfileInputRequest::new()
        .send_json_in(MessageExchangeFfi)
        .unwrap()
    {
        ParseProfileInputResponse::Ok { profile, file_path } => (profile, file_path),
        ParseProfileInputResponse::Err { message } => {
            panic!("parse-ts-profile-input error: {}", message)
        }
    };

    let (mut profile, spans, diagnostics) = parse_profile(&profile);
    if let Some(file_path) = file_path {
        if let Some(profile_id) = parse_profile_id_from_path(&file_path) {
            profile.id = profile_id;
        }
    }

    match ParseTsProfileOutputRequest::new(profile, spans, diagnostics)
        .send_json_in(MessageExchangeFfi)
        .unwrap()
    {
        ParseTsProfileOutputResponse::Ok => (),
        ParseTsProfileOutputResponse::Err { message } => {
            panic!("parse-ts-profile-output error: {}", message)
        }
    }
}
