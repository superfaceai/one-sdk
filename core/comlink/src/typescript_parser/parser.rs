use std::{collections::HashSet, fmt::Display, ops::Deref};

use biome_js_parser::{parse, JsParserOptions};
use biome_js_syntax::{
    inner_string_text, numbers::parse_js_number, AnyJsArrayElement, AnyJsExpression,
    AnyJsLiteralExpression, AnyJsModuleItem, AnyJsObjectMember, AnyJsObjectMemberName, AnyJsRoot,
    AnyJsStatement, AnyTsName, AnyTsType, AnyTsTypeMember, JsFileSource, JsLanguage,
    JsObjectExpression, JsSyntaxKind, JsSyntaxNode, JsSyntaxToken, JsUnaryOperator,
    JsVariableDeclarator, TsObjectType, TsPropertySignatureTypeMember, TsReferenceType,
    TsTypeAliasDeclaration, TsTypeArguments, TsUnionType,
};
use biome_rowan::{AstNode, SyntaxTriviaPiece, TextRange};

use crate::{
    json::{json, json_map, JsonMap, JsonSchema, JsonValue},
    typescript_parser::{
        diagnostic::{Diagnostic, DiagnosticCode, DiagnosticSeverity},
        model::{Documentation, Profile, UseCase},
    },
};

use super::{
    const_eval::{self, UnaryOperator},
    UseCaseExample, UseCaseSafety,
};

struct PartialDiagnostic(pub DiagnosticCode, pub TextRange);
struct Diagnostics(pub Vec<Diagnostic>);
impl Diagnostics {
    pub fn new() -> Self {
        Self(Vec::new())
    }

    fn map_text_range(range: TextRange) -> [usize; 2] {
        [
            u32::from(range.start()) as usize,
            u32::from(range.end()) as usize,
        ]
    }
    fn diagnostic(&mut self, part: PartialDiagnostic, severity: DiagnosticSeverity) {
        self.0.push(Diagnostic {
            severity,
            message: part.0.description().into(),
            code: part.0 as u16,
            range: Self::map_text_range(part.1),
        });
    }
    fn error(&mut self, part: PartialDiagnostic) {
        self.diagnostic(part, DiagnosticSeverity::Error)
    }
    fn warn(&mut self, part: PartialDiagnostic) {
        self.diagnostic(part, DiagnosticSeverity::Warning)
    }
    fn diagnostic_detail(
        &mut self,
        part: PartialDiagnostic,
        severity: DiagnosticSeverity,
        detail: impl Display,
    ) {
        self.0.push(Diagnostic {
            severity,
            message: format!("{}: {}", part.0.description(), detail),
            code: part.0 as u16,
            range: Self::map_text_range(part.1),
        });
    }
    fn error_detail(&mut self, part: PartialDiagnostic, detail: impl Display) {
        self.diagnostic_detail(part, DiagnosticSeverity::Error, detail);
    }
    fn warn_detail(&mut self, part: PartialDiagnostic, detail: impl Display) {
        self.diagnostic_detail(part, DiagnosticSeverity::Warning, detail);
    }
}

macro_rules! ast_do {
    (_common $diag_code: ident, $result: expr, $target: expr $(, $range_target: expr)? ) => {
        {
            #[allow(unused_variables)]
            let range_target = &$target;
            $( let range_target = &$range_target; )?
            $result.ok_or_else(|| PartialDiagnostic(DiagnosticCode::$diag_code, range_target.range()))
        }
    };
    // methods like `x.foo() -> Option<T>` map to `Result<T, PartialDiagnostic of x>`
    (or( $diag_code: ident, $target: expr, .$method: ident $(, $range_target: expr)? $(,)? )) => {
        ast_do!(_common $diag_code, $target.$method(), $target $(, $range_target)? )
    };
    (or( $diag_code: ident, $target: expr, $fun: expr $(, $range_target: expr)? $(,)? )) => {
        ast_do!(_common $diag_code, $fun($target), $target $(, $range_target)? )
    };
    // methods like `x.foo() -> Result<T, _>` map to `Result<T, PartialDiagnostic of x>`
    (err( $diag_code: ident, $target: expr, .$method: ident $(, $range_target: expr)? $(,)? )) => {
        ast_do!(_common $diag_code, $target.$method().ok(), $target $(, $range_target)? )
    };
    (err( $diag_code: ident, $target: expr, $fun: expr $(, $range_target: expr)? $(,)? )) => {
        ast_do!(_common $diag_code, $fun($target).ok(), $target $(, $range_target)? )
    };
    // extracts one variant of target enum or `Err(PartialDiagnostic of target)`
    (mtch( $diag_code: ident, $target: expr, $variant: path $(, $range_target: expr)? $(,)? )) => {
        {
            #[allow(unused_variables)]
            let range_target = &$target;
            $( let range_target = &$range_target; )?
            match $target {
                $variant(v) => Ok(v),
                _ => Err(PartialDiagnostic(
                    DiagnosticCode::$diag_code,
                    range_target.range(),
                )),
            }
        }
    };
    // for and_then chain below
    (and_then( $diag_code: ident, $target: expr, $fun: expr $(,)? )) => {
        $fun($target)
    };
    // and_then chain
    (
        $diag_code: ident, $first_target: expr; [
            $($inner: tt)+
        ] catch($catch_name: ident) { $($catch_body: tt)+ }
    ) => {
        match ast_do!($diag_code, $first_target; [ $($inner)+ ]) {
            Ok(v) => v,
            Err($catch_name) => { $($catch_body)+ }
        }
    };
    (
        $diag_code: ident, $first_target: expr; [
            $($op: ident( $($op_args: tt)+ )),+
            $(,)?
        ]
    ) => {
        Ok($first_target) $(
            .and_then(|v| ast_do!($op( $diag_code, v, $($op_args)+ )))
        )+
    };
}

struct StandaloneUsecaseExamples {
    pub usecase_name: String,
    pub node_range: TextRange,
    pub examples: Vec<UseCaseExample>,
}

pub struct ProfileParser<'a> {
    source: &'a str,
    diag: Diagnostics,
}
impl<'a> ProfileParser<'a> {
    pub fn parse(source: &'a str) -> (Profile, Vec<Diagnostic>) {
        let mut context = Self {
            source,
            diag: Diagnostics::new(),
        };

        let profile = context.parse_profile();

        (profile, context.diag.0)
    }

    fn parse_profile(&mut self) -> Profile {
        let mut profile = Profile::default();

        let parsed = parse(self.source, JsFileSource::ts(), JsParserOptions::default());
        let script = match parsed.tree() {
            AnyJsRoot::JsModule(m) => m,
            _ => {
                self.diag.error_detail(
                    PartialDiagnostic(DiagnosticCode::Unknown, parsed.syntax().text_range()),
                    "expected TypeScript module",
                );
                return profile;
            }
        };

        let mut all_examples = Vec::<StandaloneUsecaseExamples>::new();

        // usecases: find all `type $usecase_name = UseCase<$usecase_ty>` nodes
        // examples: find all `const ..: $usecase_name['examples'] = [$usecase_examples]`
        for item in script.items() {
            let statement = match item {
                AnyJsModuleItem::AnyJsStatement(s) => s,
                _ => continue,
            };

            match statement {
                // [type X = Y<Z>]
                AnyJsStatement::TsTypeAliasDeclaration(dec) if is_usecase_root(&dec) => {
                    profile.usecases.push(self.parse_usecase(dec));
                }
                AnyJsStatement::JsVariableStatement(stmt) => {
                    if let Ok(declaration) = stmt.declaration() {
                        for decl in declaration.declarators() {
                            if let Ok(decl) = decl {
                                if is_usecase_example_root(&decl) {
                                    all_examples.push(self.parse_examples(decl));
                                }
                            }
                        }
                    }
                }
                _ => continue,
            }
        }

        for e in all_examples {
            let usecase = profile
                .usecases
                .iter_mut()
                .find(|u| u.name == e.usecase_name);
            match usecase {
                Some(usecase) => {
                    usecase.examples.extend(e.examples.into_iter());
                }
                None => self.diag.warn_detail(
                    PartialDiagnostic(DiagnosticCode::UsecaseExampleInvalid, e.node_range),
                    format_args!(
                        "Use case \"{}\" is not defined, these examples will be ignored",
                        e.usecase_name
                    ),
                ),
            }
        }

        profile
    }

    fn parse_usecase(&mut self, root: TsTypeAliasDeclaration) -> UseCase {
        let mut usecase = UseCase::default();
        let mut required_members = HashSet::from(["safety", "input", "result", "error"]);

        usecase.name = ast_do!(UsecaseNameInvalid, &root; [
            err(.binding_identifier),
            err(.name_token)
        ] catch(err) {
            self.diag.error(err);
            return usecase;
        })
        .text_trimmed()
        .into();

        usecase.documentation = self.parse_documentation(root.syntax());

        let usecase_options = match extract_usecase_options(&root.ty().unwrap()) {
            Ok(v) => v,
            Err(err) => {
                self.diag.error(err);
                return usecase;
            }
        };

        for member in usecase_options.members() {
            match member {
                AnyTsTypeMember::TsPropertySignatureTypeMember(p) => {
                    let name_text = ast_do!(UsecaseMemberUnknown, &p; [
                        err(.name),
                        or(.name),
                    ] catch(err) {
                        self.diag.error(err);
                        continue;
                    });

                    required_members.remove(name_text.deref());
                    match name_text.deref() {
                        "safety" => match extract_usecase_safety(&p) {
                            Ok(safety) => {
                                usecase.safety = safety;
                            }
                            Err(err) => self
                                .diag
                                .error_detail(err, "expected one of `safe, idempotent, unsafe`"),
                        },
                        "input" => usecase.input = self.parse_usecase_top_schema(p),
                        "result" => usecase.result = self.parse_usecase_top_schema(p),
                        "error" => usecase.error = self.parse_usecase_top_schema(p),
                        _ => self.diag.warn(PartialDiagnostic(
                            DiagnosticCode::UsecaseMemberUnknown,
                            p.range(),
                        )),
                    }
                }
                m => {
                    self.diag.warn(PartialDiagnostic(
                        DiagnosticCode::UsecaseMemberUnknown,
                        m.range(),
                    ));
                }
            }
        }
        for missing_member in required_members {
            self.diag.error_detail(
                PartialDiagnostic(
                    DiagnosticCode::UsecaseMemberInvalid,
                    usecase_options.range(),
                ),
                missing_member,
            );
        }

        usecase
    }

    /// Parses documentation comment from syntax node leading whitespace.
    fn parse_documentation(&mut self, v: &JsSyntaxNode) -> Documentation {
        const DOC_TRIM_CHARS: &[char] = &[' ', '\n', '\t', '*'];

        let mut doc = Documentation::default();
        let doc_comment = match try_extract_documentation(v) {
            Some(d) => d,
            None => return doc,
        };

        let text = match doc_comment
            .text()
            .strip_prefix("/**")
            .and_then(|s| s.strip_suffix("*/"))
        {
            Some(t) => t.trim_matches(DOC_TRIM_CHARS),
            None => {
                self.diag.warn_detail(
                    PartialDiagnostic(DiagnosticCode::Unknown, doc_comment.text_range()),
                    "invalid doc comment",
                );
                return doc;
            }
        };

        match text.split_once('\n') {
            Some((title, description)) => {
                doc.title = Some(title.trim_matches(DOC_TRIM_CHARS).into());

                // we need to find a common prefix and strip it from each line.
                let lines: Vec<&str> = description.split('\n').collect();
                let mut longest_prefix = lines[0];
                for line in &lines[1..] {
                    longest_prefix = doc_line_common_prefix(longest_prefix, line);
                }

                let mut description = String::new();
                for line in lines {
                    let line = &line[longest_prefix.len()..];
                    if line.len() > 0 {
                        if description.len() > 0 {
                            description.push('\n');
                        }
                        description.push_str(line);
                    }
                }

                if description.len() > 0 {
                    doc.description = Some(description);
                }
            }
            None => {
                doc.title = Some(text.into());
            }
        }

        doc
    }
    /// Entry point into parsing `input`, `result` and `error` schemas
    ///
    /// The difference from [`Self::parse_type_schema`] is that we also insert common definitions here (e.g. AnyValue)
    /// and can emit more specific warnings.
    fn parse_usecase_top_schema(&mut self, root: TsPropertySignatureTypeMember) -> JsonSchema {
        if let Some(token) = root.optional_token() {
            self.diag.warn_detail(
                PartialDiagnostic(DiagnosticCode::UsecaseMemberInvalid, token.text_range()),
                "optional is not allowed here",
            );
        }
        if let Some(token) = root.readonly_token() {
            self.diag.warn_detail(
                PartialDiagnostic(DiagnosticCode::UsecaseMemberInvalid, token.text_range()),
                "readonly is not allowed here",
            );
        }

        let ty = ast_do!(UsecaseMemberInvalid, &root; [
            or(.type_annotation),
            err(.ty)
        ] catch(err) {
            self.diag.error(err);
            return JsonSchema::Null;
        });

        let mut raw_schmea = self.parse_type_schema(ty);
        raw_schmea.insert(
            "$defs".into(),
            json!({
                "AnyValue": anyvalue_schema("#/$defs/AnyValue")
            }),
        );

        let Documentation { title, description } = self.parse_documentation(root.syntax());
        if let Some(title) = title {
            raw_schmea.insert("title".into(), title.into());
        }
        if let Some(description) = description {
            raw_schmea.insert("description".into(), description.into());
        }

        JsonValue::Object(raw_schmea)
    }
    /// Entry point into parsing schema of any type.
    fn parse_type_schema(&mut self, ty: AnyTsType) -> JsonMap {
        match ty {
            AnyTsType::TsObjectType(obj) => self.parse_type_schema_object(obj),
            AnyTsType::TsUnionType(u) => self.parse_type_schema_union(u),
            AnyTsType::TsReferenceType(r) => self.parse_type_schema_reference(r),
            AnyTsType::TsNumberType(_) => json_map!({ "type": "number" }),
            AnyTsType::TsStringType(_) => json_map!({ "type": "string" }),
            AnyTsType::TsNullLiteralType(_) => json_map!({ "type": "null" }),
            _ => todo!("{:?}", ty),
        }
    }
    /// ```json
    /// {
    ///     "type": "object",
    ///     "properties": {
    ///         <property>: <recurse>
    ///     },
    ///     "required": [],
    ///     "additionalProperties": false
    /// }
    /// ```
    fn parse_type_schema_object(&mut self, obj: TsObjectType) -> JsonMap {
        let mut required_props = Vec::<JsonValue>::new();
        let additional_properties = false;
        let mut properties = JsonMap::default();
        for prop in obj.members().into_iter() {
            match prop {
                AnyTsTypeMember::TsPropertySignatureTypeMember(p) => {
                    let name = ast_do!(UsecaseMemberInvalid, &p; [
                        err(.name),
                        or(.name)
                    ] catch(err) {
                        self.diag.error(err);
                        continue;
                    });
                    let ty = ast_do!(UsecaseMemberInvalid, &p; [
                        or(.type_annotation),
                        err(.ty)
                    ] catch(err) {
                        self.diag.error(err);
                        continue;
                    });

                    if p.optional_token().is_none() {
                        required_props.push(name.deref().into());
                    }

                    let mut prop_schema = self.parse_type_schema(ty);
                    let Documentation { title, description } = self.parse_documentation(p.syntax());
                    if let Some(title) = title {
                        prop_schema.insert("title".into(), title.into());
                    }
                    if let Some(description) = description {
                        prop_schema.insert("description".into(), description.into());
                    }

                    properties.insert(name.deref().into(), prop_schema.into());
                }
                // TODO: TsIndexSignatureTypeMember and additional_properties
                _ => todo!(),
            }
        }

        json_map!({
            "type": "object",
            "properties": properties,
            "required": JsonValue::Array(required_props),
            "additionalProperties": additional_properties
        })
    }
    /// `AnyValue`:
    /// ```json
    /// { "$ref": <ref> }
    /// ```
    ///
    /// `Array<E>`:
    /// ```json
    /// { "type": "array", "items": <recurse E> }
    /// ```
    ///
    /// `Record<string, V>`
    /// ```json
    /// { "type": "object", "additionalProperties": <recurse V> }
    /// ```
    fn parse_type_schema_reference(&mut self, r: TsReferenceType) -> JsonMap {
        let name = ast_do!(
            UsecaseMemberInvalid, &r; [
                err(.name),
                and_then(extract_type_name)
            ] catch(err) {
                self.diag.error(err);
                return json_map!({});
            }
        );

        match name.len() {
            1 if name[0] == "AnyValue" => {
                json_map!({ "$ref": "#/$defs/AnyValue" })
            }
            1 if name[0] == "Array" => {
                let [arg] = ast_do!(
                    GlobalTypeInvalid, &r; [
                        or(.type_arguments),
                        and_then(extract_type_arguments::<1>)
                    ] catch(err) {
                        self.diag.error_detail(err, "Array type must have 1 generic type argument");
                        return json_map!({});
                    }
                );

                json_map!({
                    "type": "array",
                    "items": self.parse_type_schema(arg)
                })
            }
            1 if name[0] == "Record" => {
                todo!()
            }
            _ => {
                self.diag.error_detail(
                    PartialDiagnostic(DiagnosticCode::GlobalTypeUnknown, r.range()),
                    format_args!("unknown type `{}`", name.join(".")),
                );
                json_map!({})
            }
        }
    }
    /// ```json
    /// { "oneOf": [<recurse>] }
    /// ```
    fn parse_type_schema_union(&mut self, u: TsUnionType) -> JsonMap {
        // TODO: optimize union of primitive types to `"type": []`
        let mut variants = Vec::<JsonValue>::new();
        for ty in u.types() {
            let v = ast_do!(UsecaseMemberInvalid, ty; [
                mtch(Ok, u)
            ] catch(err) {
                self.diag.error(err);
                continue
            });
            variants.push(JsonValue::Object(self.parse_type_schema(v)));
        }

        json_map!({
            "oneOf": JsonValue::Array(variants)
        })
    }

    fn parse_examples(&mut self, root: JsVariableDeclarator) -> StandaloneUsecaseExamples {
        let mut result = StandaloneUsecaseExamples {
            usecase_name: "<error>".into(),
            node_range: root.range(),
            examples: Vec::new(),
        };

        result.usecase_name = match extract_usecase_example_usecase_name(&root) {
            Ok(n) => n,
            Err(err) => {
                self.diag.error(err);
                return result;
            }
        };

        let initializer = ast_do!(UsecaseExamplesArrayInvalid, root; [
            or(.initializer),
            err(.expression),
            mtch(AnyJsExpression::JsArrayExpression)
        ] catch(err) {
            self.diag.error_detail(err, "examples must be initialized to an array");
            return result;
        });
        for element in initializer.elements() {
            let element = ast_do!(UsecaseExampleInvalid, element; [
                mtch(Ok, initializer),
                mtch(AnyJsArrayElement::AnyJsExpression),
                mtch(AnyJsExpression::JsObjectExpression),
            ] catch(err) {
                self.diag.error(err);
                continue;
            });
            if let Some(example) = self.parse_example_element(element) {
                result.examples.push(example);
            }
        }
        result
    }

    fn parse_example_element(&mut self, root: JsObjectExpression) -> Option<UseCaseExample> {
        let mut is_error = true;
        let mut name = None;
        let mut input = JsonValue::Null;
        let mut output = JsonValue::Null;

        for member in root.members() {
            let member = ast_do!(UsecaseExampleInvalid, member; [
                mtch(Ok, root),
                mtch(AnyJsObjectMember::JsPropertyObjectMember),
            ] catch(err) {
                self.diag.error(err);
                return None;
            });

            let member_name = ast_do!(UsecaseExampleInvalid, &member; [
                err(.name),
                or(.name),
            ] catch(err) {
                self.diag.error(err);
                return None;
            });

            let member_value = ast_do!(UsecaseExampleInvalid, &member; [
                err(.value)
            ] catch(err) {
                self.diag.error(err);
                return None;
            });

            match member_name.deref() {
                "input" => input = self.parse_example_element_value(member_value),
                "result" => {
                    is_error = false;
                    output = self.parse_example_element_value(member_value);
                }
                "error" => {
                    is_error = true;
                    output = self.parse_example_element_value(member_value);
                }
                "name" => match ast_do!(UsecaseExampleInvalid, member_value; [
                    mtch(AnyJsExpression::AnyJsLiteralExpression),
                    mtch(AnyJsLiteralExpression::JsStringLiteralExpression),
                    err(.value_token),
                ]) {
                    Ok(v) => {
                        name = Some(inner_string_text(&v).text().into());
                    }
                    Err(err) => {
                        self.diag
                            .error_detail(err, "example name must be a string literal");
                    }
                },
                _ => self.diag.warn(PartialDiagnostic(
                    DiagnosticCode::UsecaseExampleMemberUnknown,
                    member.range(),
                )),
            }
        }

        Some(if is_error {
            UseCaseExample::Failure {
                name,
                input,
                error: output,
            }
        } else {
            UseCaseExample::Success {
                name,
                input,
                result: output,
            }
        })
    }

    fn parse_example_element_value(&mut self, expr: AnyJsExpression) -> JsonValue {
        match expr {
            AnyJsExpression::AnyJsLiteralExpression(lit) => {
                self.parse_example_element_value_literal(lit)
            }
            AnyJsExpression::JsObjectExpression(obj) => {
                self.parse_example_element_value_object(obj)
            }
            AnyJsExpression::JsUnaryExpression(expr) => {
                let operator = ast_do!(UsecaseExampleMemberInvalid, &expr; [
                    err(.operator)
                ] catch(err) {
                    self.diag.error(err);
                    return JsonValue::Null;
                });
                let operator = match operator {
                    JsUnaryOperator::Plus => UnaryOperator::Plus,
                    JsUnaryOperator::Minus => UnaryOperator::Minus,
                    JsUnaryOperator::BitwiseNot => UnaryOperator::BitwiseNot,
                    JsUnaryOperator::LogicalNot => UnaryOperator::LogicalNot,
                    _ => {
                        self.diag.error_detail(
                            PartialDiagnostic(
                                DiagnosticCode::UsecaseExampleMemberInvalid,
                                expr.range(),
                            ),
                            "expected one of `+ - ~ !`",
                        );
                        return JsonValue::Null;
                    }
                };

                let argument = ast_do!(UsecaseExampleMemberInvalid, &expr; [
                    err(.argument)
                ] catch(err) {
                    self.diag.error(err);
                    return JsonValue::Null;
                });
                let argument = self.parse_example_element_value(argument);

                const_eval::eval_unary(operator, argument)
            }
            expr => todo!("{:#?}", expr),
        }
    }

    fn parse_example_element_value_object(&mut self, obj: JsObjectExpression) -> JsonValue {
        let mut map = JsonMap::default();
        for member in obj.members() {
            let member = ast_do!(UsecaseExampleMemberInvalid, member; [
                mtch(Ok, obj),
                mtch(AnyJsObjectMember::JsPropertyObjectMember)
            ] catch(err) {
                self.diag.error(err);
                continue;
            });

            let member_name = ast_do!(UsecaseExampleMemberInvalid, &member; [
                err(.name),
                mtch(AnyJsObjectMemberName::JsLiteralMemberName),
                err(.name)
            ] catch(err) {
                self.diag.error(err);
                continue;
            });

            let member_value = ast_do!(UsecaseExampleMemberInvalid, &member; [
                err(.value)
            ] catch(err) {
                self.diag.error(err);
                continue;
            });

            map.insert(
                member_name.deref().into(),
                self.parse_example_element_value(member_value),
            );
        }

        JsonValue::Object(map)
    }

    fn parse_example_element_value_literal(&mut self, lit: AnyJsLiteralExpression) -> JsonValue {
        let result = match lit {
            AnyJsLiteralExpression::JsNullLiteralExpression(_) => Ok(JsonValue::Null),
            AnyJsLiteralExpression::JsBooleanLiteralExpression(l) => {
                ast_do!(err(UsecaseExampleMemberInvalid, &l, .value_token))
                    .map(|v| JsonValue::Bool(v.kind() == JsSyntaxKind::TRUE_KW))
            }
            AnyJsLiteralExpression::JsNumberLiteralExpression(l) => {
                ast_do!(UsecaseExampleMemberInvalid, &l; [
                    // TODO: would use as_number but https://github.com/biomejs/biome/pull/1447
                    err(.value_token),
                    or(|v: JsSyntaxToken| parse_js_number(v.text_trimmed()), &l),
                    or(serde_json::Number::from_f64, &l)
                ])
                .map(JsonValue::Number)
            }
            AnyJsLiteralExpression::JsStringLiteralExpression(l) => {
                ast_do!(err(UsecaseExampleMemberInvalid, &l, .value_token))
                    .map(|s| JsonValue::String(inner_string_text(&s).text().into()))
            }
            lit => todo!("{:#?}", lit),
        };
        match result {
            Ok(r) => r,
            Err(err) => {
                self.diag.error(err);
                JsonValue::Null
            }
        }
    }
}

fn is_usecase_root(v: &TsTypeAliasDeclaration) -> bool {
    // type X = |Y<Z>|;
    let ref_ty = match v.ty() {
        Ok(AnyTsType::TsReferenceType(v)) => v,
        _ => return false,
    };
    // type X = |Y|<Z>;
    let name = match ref_ty.name() {
        Ok(n) => match extract_type_name(n) {
            Ok(n) => n,
            _ => return false,
        },
        _ => return false,
    };

    return name.len() == 1 && name[0] == "UseCase";
}
fn is_usecase_example_root(v: &JsVariableDeclarator) -> bool {
    // const X: Y = |Z|
    match v.initializer() {
        Some(i) => match i.expression() {
            // check if Z is array expression
            Ok(AnyJsExpression::JsArrayExpression(_)) => (),
            _ => return false,
        },
        _ => return false,
    };

    // const X|: Y| = Z
    let annot = match v.variable_annotation() {
        Some(v) => match v.type_annotation() {
            Ok(Some(a)) => a,
            _ => return false,
        },
        _ => return false,
    };

    // const X: |Y[W]| = Z
    let index_access = match annot.ty() {
        // check if `const X: |Y|[W] = Z` Y is reference (should be use case name)
        Ok(AnyTsType::TsIndexedAccessType(i))
            if matches!(i.object_type(), Ok(AnyTsType::TsReferenceType(_))) =>
        {
            i
        }
        _ => return false,
    };

    // const X: Y|[W]| = Z
    ast_do!(UsecaseMemberInvalid, index_access; [
        err(.index_type),
        mtch(AnyTsType::TsStringLiteralType),
        err(.literal_token),
    ])
    .map(|token| trim_type_string_literal(token.text()) == "examples")
    .unwrap_or(false)
}

fn try_extract_documentation(v: &JsSyntaxNode) -> Option<SyntaxTriviaPiece<JsLanguage>> {
    v.first_token().and_then(|t| {
        t.leading_trivia()
            .pieces()
            .rev()
            .find(|p| p.is_comments() && p.text().starts_with("/**"))
    })
}
fn extract_type_arguments<const N: usize>(
    v: TsTypeArguments,
) -> Result<[AnyTsType; N], PartialDiagnostic> {
    let mut iter = v.ts_type_argument_list().into_iter();

    let empty_array = [(); N];
    let result = empty_array.map(|_| match iter.next() {
        Some(Ok(v)) => Some(v),
        _ => None,
    });
    // a little hack because we don't have `try_map` on stable
    for r in result.iter() {
        if r.is_none() {
            return Err(PartialDiagnostic(
                DiagnosticCode::GlobalTypeInvalid,
                v.range(),
            ));
        }
    }

    Ok(result.map(|v| v.unwrap()))
}

fn extract_usecase_safety(
    v: &TsPropertySignatureTypeMember,
) -> Result<UseCaseSafety, PartialDiagnostic> {
    let token = ast_do!(UsecaseMemberInvalid, v; [
        or(.type_annotation),
        err(.ty),
        mtch(AnyTsType::TsStringLiteralType),
        err(.literal_token),
    ])?;

    match trim_type_string_literal(token.text()) {
        "safe" => Ok(UseCaseSafety::Safe),
        "idempotent" => Ok(UseCaseSafety::Idempotent),
        "unsafe" => Ok(UseCaseSafety::Unsafe),
        _ => Err(PartialDiagnostic(
            DiagnosticCode::UsecaseMemberInvalid,
            token.text_range(),
        )),
    }
}
/// Extracts the first type argument of a type reference (named type), as expected for `type UseCaseName = UseCase<X>`.
fn extract_usecase_options(v: &AnyTsType) -> Result<TsObjectType, PartialDiagnostic> {
    let [first_arg] = ast_do!(UsecaseInvalid, v; [
        mtch(AnyTsType::TsReferenceType),
        or(.type_arguments),
    ])
    .and_then(extract_type_arguments::<1>)?;
    let obj = ast_do!(mtch(UsecaseInvalid, first_arg, AnyTsType::TsObjectType))?;

    Ok(obj)
}
fn extract_usecase_example_usecase_name(
    v: &JsVariableDeclarator,
) -> Result<String, PartialDiagnostic> {
    let type_annotation = ast_do!(UsecaseExampleInvalid, v; [
        or(.variable_annotation),
        err(.type_annotation),
    ])?
    .unwrap(); // the implementation always returns Some
    let name = ast_do!(UsecaseExampleInvalid, type_annotation; [
        err(.ty),
        mtch(AnyTsType::TsIndexedAccessType),
        err(.object_type),
        mtch(AnyTsType::TsReferenceType),
        err(.name),
    ])?;

    let name_range = name.range();
    match extract_type_name(name) {
        Ok(name) if name.len() == 1 => Ok(name.into_iter().next().unwrap()),
        _ => Err(PartialDiagnostic(
            DiagnosticCode::UsecaseExampleInvalid,
            name_range,
        )),
    }
}

fn extract_type_name(v: AnyTsName) -> Result<Vec<String>, PartialDiagnostic> {
    let mut result = Vec::new();

    let mut current = v;
    loop {
        match current {
            AnyTsName::JsReferenceIdentifier(ref r) => {
                let name = ast_do!(err(Unknown, r, .name))?;
                result.push(name.deref().into());
                break;
            }
            AnyTsName::TsQualifiedName(ref q) => {
                let value = ast_do!(Unknown, q; [
                    err(.right),
                    err(.value_token),
                ])?;
                result.push(value.token_text_trimmed().deref().into());

                let left = ast_do!(err(Unknown, q, .left))?;
                current = left;
            }
        }
    }

    result.reverse();
    Ok(result)
}

/// JavaScript string literals have a method for this, but TypeScript type string literals don't
fn trim_type_string_literal(literal: &str) -> &str {
    let mut current = literal.trim();

    if (current.starts_with('\'') && current.ends_with('\''))
        || (current.starts_with('"') && current.ends_with('"'))
    {
        current = &current[1..literal.len() - 1];
    }

    current.trim()
}

fn doc_line_common_prefix<'a>(left: &'a str, right: &str) -> &'a str {
    let mut prefix_len = 0;
    let mut seen_asterisk = false;
    for (l, r) in left.chars().zip(right.chars()) {
        if l != r {
            break;
        }

        if l == '*' {
            if seen_asterisk {
                break;
            } else {
                seen_asterisk = true;
            }
        } else if !l.is_whitespace() {
            break;
        }

        prefix_len += l.len_utf8();
    }

    &left[..prefix_len]
}

fn anyvalue_schema(ref_path: &str) -> JsonSchema {
    json!({
        "anyOf": [
            { "type": "null" },
            { "type": "string" },
            { "type": "number" },
            { "type": "boolean" },
            {
                "type": "array",
                "items": { "$ref": ref_path }
            },
            {
                "type": "object",
                "additionalProperties": { "$ref": ref_path }
            }
        ]
    })
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_doc_line_commmon_prefix() {
        assert_eq!(doc_line_common_prefix(" abc", " abc"), " ");
        assert_eq!(doc_line_common_prefix(" * abc", " * abc"), " * ");
        assert_eq!(doc_line_common_prefix("\t ", "\t \t"), "\t ");
        assert_eq!(doc_line_common_prefix(" * * a", " * * a"), " * ");
    }

    #[test]
    fn test_anyvalue_schema() {
        let schema = anyvalue_schema("#");
        let validator = crate::json_schema_validator::JsonSchemaValidator::new(&schema).unwrap();

        let values = [
            json!(null),
            json!("a string"),
            json!(123),
            json!(false),
            json!(["a string", 321, true, { "foo": [1, 2, 3] }]),
            json!({ "foo": null, "bar": "bar" }),
        ];

        for value in values {
            validator.validate(&value).unwrap()
        }
    }
}
