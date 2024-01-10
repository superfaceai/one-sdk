#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DiagnosticSeverity {
    Error,
    Warning,
}

/// Diagnostic that was detected when parsing the profile.
#[derive(Debug, serde::Serialize)]
pub struct Diagnostic {
    pub severity: DiagnosticSeverity,
    pub code: u16,
    pub message: String,
    pub range: [usize; 2],
}

#[repr(u16)]
pub enum DiagnosticCode {
    Unknown = 1,
    // 10x
    GlobalTypeUnknown = 101,
    GlobalTypeInvalid,
    // 21x
    UsecaseInvalid = 211,
    UsecaseNameInvalid,
    UsecaseMemberUnknown,
    UsecaseMemberInvalid,
    // 22x
    UsecaseExamplesArrayInvalid = 221,
    UsecaseExampleInvalid,
    UsecaseExampleMemberUnknown,
    UsecaseExampleMemberInvalid,
}
impl DiagnosticCode {
    pub fn description(&self) -> &'static str {
        match self {
            Self::Unknown => "Unknown",
            Self::GlobalTypeUnknown => "Global type is unknown",
            Self::GlobalTypeInvalid => "Global type is invalid or missing",
            Self::UsecaseInvalid => "Use case options are invalid or missing",
            Self::UsecaseNameInvalid => "Use case name is invalid or missing",
            Self::UsecaseMemberUnknown => "Use case member is unknown",
            Self::UsecaseMemberInvalid => "Use case member is invalid or missing",
            Self::UsecaseExamplesArrayInvalid => "Use case examples array is invalid",
            Self::UsecaseExampleInvalid => "Use case example is invalid",
            Self::UsecaseExampleMemberUnknown => "Use case example member is unknown",
            Self::UsecaseExampleMemberInvalid => "Use case example member is invalid or missing",
        }
    }
}
