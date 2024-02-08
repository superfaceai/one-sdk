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
    pub span: TextSpan,
}

#[repr(u16)]
pub enum DiagnosticCode {
    Unknown = 1,
    // 10x
    GlobalTypeUnknown = 101,
    GlobalTypeInvalid,
    ProfileInvalid,
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
            Self::GlobalTypeUnknown => "Global type unknown",
            Self::GlobalTypeInvalid => "Global type error",
            Self::ProfileInvalid => "The document is not a valid profile",
            Self::UseCaseInvalid => "Use case options error",
            Self::UseCaseNameInvalid => "Use case name error",
            Self::UseCaseMemberUnknown => "Use case member unknown",
            Self::UseCaseMemberInvalid => "Use case member error",
            Self::UseCaseExamplesArrayInvalid => "Use case examples array error",
            Self::UseCaseExampleInvalid => "Use case example error",
            Self::UseCaseExampleMemberUnknown => "Use case example member unknown",
            Self::UseCaseExampleMemberInvalid => "Use case example member error",
        }
    }
}
