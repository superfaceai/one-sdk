use super::model::TextSpan;

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
    pub range: TextSpan,
}

#[repr(u16)]
pub enum DiagnosticCode {
    Unknown = 1,
    // 10x
    GlobalTypeUnknown = 101,
    GlobalTypeInvalid,
    // 21x
    UseCaseInvalid = 211,
    UseCaseNameInvalid,
    UseCaseMemberUnknown,
    UseCaseMemberInvalid,
    // 22x
    UseCaseExamplesArrayInvalid = 221,
    UseCaseExampleInvalid,
    UseCaseExampleMemberUnknown,
    UseCaseExampleMemberInvalid,
}
impl DiagnosticCode {
    pub fn description(&self) -> &'static str {
        match self {
            Self::Unknown => "Unknown",
            Self::GlobalTypeUnknown => "Global type is unknown",
            Self::GlobalTypeInvalid => "Global type is invalid or missing",
            Self::UseCaseInvalid => "Use case options are invalid or missing",
            Self::UseCaseNameInvalid => "Use case name is invalid or missing",
            Self::UseCaseMemberUnknown => "Use case member is unknown",
            Self::UseCaseMemberInvalid => "Use case member is invalid or missing",
            Self::UseCaseExamplesArrayInvalid => "Use case examples array is invalid",
            Self::UseCaseExampleInvalid => "Use case example is invalid",
            Self::UseCaseExampleMemberUnknown => "Use case example member is unknown",
            Self::UseCaseExampleMemberInvalid => "Use case example member is invalid or missing",
        }
    }
}
