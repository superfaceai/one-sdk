use serde::{Deserialize, Serialize};

use super::{
    nodes::*,
    tokens::{Documentation, PrimitiveTypeName, ProfileVersion, StringDocToken, UseCaseSafety},
    AstNode, CstToken, LocationSpan,
};

macro_rules! serde_repr {
	(
		struct $repr_name: ident $(<$($repr_generic: ident),+>)? {
			kind: $kind_name: ident = $kind_value: ident $(+ $alt_kind_value: ident)*,
			$(
				$(#[$field_attr: meta])*
				$field_name: ident: $field_type: ty
			),+
			$(,)?
		}
		$(
			$($rest: tt)+
		)?
	) => {
		#[derive(Serialize, Deserialize)]
		enum $kind_name {
			$kind_value
			$(,
				$alt_kind_value
			)*
		}
		#[derive(Serialize, Deserialize)]
		#[allow(non_snake_case)]
		struct $repr_name $(<$($repr_generic),+>)? {
			kind: $kind_name,
			#[serde(default, skip_serializing_if = "Option::is_none")]
			location: Option<LocationSpan>,
			$(
				$(#[$field_attr])*
				$field_name: $field_type
			),+
		}
		impl $(<$($repr_generic),+>)? $repr_name $(<$($repr_generic),+>)? {
			#[allow(dead_code)]
			const KIND: $kind_name = $kind_name::$kind_value;
		}

		$(
			serde_repr! {
				repr $repr_name;
				$($rest)+
			}
		)?
	};

	(
		repr $repr_name: ty;
		for $node_name: ty;
		to_repr($to_repr_value: ident) {
			$($to_repr_tt: tt)+
		}
		from_repr($from_repr_value: ident) {
			$($from_repr_tt: tt)+
		}
	) => {
		impl Serialize for $node_name {
			fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
				match <$repr_name>::try_from(self) {
					Ok(v) => v.serialize(s),
					Err(err) => ErrorNodeRepr {
						kind: ErrorNodeRepr::KIND,
						location: Some(self.location()),
						error: err.to_string()
					}.serialize(s)
				}
			}
		}
		impl<'de> Deserialize<'de> for $node_name {
			fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
				<$repr_name>::deserialize(d).map(<$node_name>::from)
			}
		}
		impl<'a> TryFrom<&'a $node_name> for $repr_name {
			type Error = &'static str;

			fn try_from($to_repr_value: &'a $node_name) -> Result<Self, Self::Error> {
				Ok({
					$($to_repr_tt)+
				})
			}
		}
		impl From<$repr_name> for $node_name {
			fn from($from_repr_value: $repr_name) -> Self {
				$($from_repr_tt)+
			}
		}
	};

	() => {};
}

// MISC //
serde_repr! {
    struct ErrorNodeRepr {
        kind: ErrorNodeKind = Error,
        error: String
    }
}

#[derive(Serialize, Deserialize)]
struct DocumentationRepr {
    #[serde(flatten)]
    inner: Documentation,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    location: Option<LocationSpan>,
}
serde_repr! {
    repr DocumentationRepr;
    for StringDocToken;
    to_repr(node) {
        let doc = node.value().ok_or("doc missing")?;

        Self {
            inner: doc,
            location: Some(node.location())
        }
    }
    from_repr(_value) {
        todo!()
    }
}

// PROFILE //
serde_repr! {
    struct ProfileDocumentNodeRepr {
        kind: ProfileDocumentNodeKind = ProfileDocument,
        astMetadata: AstMetadata,
        header: ProfileHeaderNode,
        definitions: Vec<ProfileDocumentDefinitionNode>
    }
    for ProfileDocumentNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            astMetadata: node.metadata(),
            header: node.header().ok_or("header missing")?,
            definitions: node.definitions().collect()
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct ProfileHeaderNodeRepr {
        kind: ProfileHeaderNodeKind = ProfileHeader,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        documentation: Option<StringDocToken>,
        scope: Option<String>,
        name: String,
        version: ProfileVersion
    }
    for ProfileHeaderNode;
    to_repr(node) {
        let id = node.name().and_then(|n| n.id()).ok_or("profile id missing")?;

        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            scope: id.scope,
            name: id.name,
            version: node.version().and_then(|v| v.value()).ok_or("version missing")?
        }
    }
    from_repr(_value) {
        todo!()
    }
}

// USECASE //
serde_repr! {
    struct UseCaseDefinitionNodeRepr {
        kind: UseCaseDefinitionNodeKind = UseCaseDefinition,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        documentation: Option<StringDocToken>,
        useCaseName: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        safety: Option<UseCaseSafety>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        input: Option<UseCaseDefinitionInputNode>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        result: Option<UseCaseDefinitionResultNode>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        asyncResult: Option<UseCaseDefinitionAsyncResultNode>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        error: Option<UseCaseDefinitionErrorNode>,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        examples: Vec<UseCaseDefinitionExampleNode>
    }
    for UseCaseDefinitionNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            useCaseName: node.name().map(|n| n.value().to_string()).ok_or("usecase name missing")?,
            safety: node.safety().map(|s| s.value()),
            input: node.input(),
            result: node.result(),
            asyncResult: node.async_result(),
            error: node.error(),
            examples: node.examples().collect()
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct UseCaseDefinitionSlotRepr<T> {
        kind: UseCaseDefinitionSlotKind = UseCaseSlotDefinition,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        documentation: Option<StringDocToken>,
        value: T
    }
}
serde_repr! {
    repr UseCaseDefinitionSlotRepr<ObjectTypeNode>;
    for UseCaseDefinitionInputNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            value: node.ty().ok_or("type missing")?
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    repr UseCaseDefinitionSlotRepr<TypeNode>;
    for UseCaseDefinitionResultNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            value: node.ty().ok_or("type missing")?
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    repr UseCaseDefinitionSlotRepr<TypeNode>;
    for UseCaseDefinitionAsyncResultNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            value: node.ty().ok_or("type missing")?
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    repr UseCaseDefinitionSlotRepr<TypeNode>;
    for UseCaseDefinitionErrorNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            value: node.ty().ok_or("type missing")?
        }
    }
    from_repr(_value) {
        todo!()
    }
}
// USECASE EXAMPLES //
// TODO: This is very hacky, we should revise the AST serde representation later to fix this
serde_repr! {
    struct UseCaseDefinitionExampleNodeRepr {
        kind: UseCaseDefinitionExampleNodeKind = UseCaseExample,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        exampleName: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        input: Option<UseCaseDefinitionExampleInputNode>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        result: Option<UseCaseDefinitionExampleResultNode>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        asyncResult: Option<UseCaseDefinitionExampleAsyncResultNode>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        error: Option<UseCaseDefinitionExampleErrorNode>,
    }
}
serde_repr! {
    repr UseCaseDefinitionSlotRepr<UseCaseDefinitionExampleNodeRepr>;
    for UseCaseDefinitionExampleNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            value: UseCaseDefinitionExampleNodeRepr {
                kind: UseCaseDefinitionExampleNodeRepr::KIND,
                location: Some(node.location()),
                exampleName: node.name().map(|n| n.value().to_string()),
                input: node.input(),
                result: node.result(),
                asyncResult: node.async_result(),
                error: node.error()
            }
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    repr UseCaseDefinitionSlotRepr<ObjectLiteralNode>;
    for UseCaseDefinitionExampleInputNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            value: node.literal().ok_or("literal missing")?
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    repr UseCaseDefinitionSlotRepr<LiteralNode>;
    for UseCaseDefinitionExampleResultNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            value: node.literal().ok_or("literal missing")?
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    repr UseCaseDefinitionSlotRepr<LiteralNode>;
    for UseCaseDefinitionExampleAsyncResultNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            value: node.literal().ok_or("literal missing")?
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    repr UseCaseDefinitionSlotRepr<LiteralNode>;
    for UseCaseDefinitionExampleErrorNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            value: node.literal().ok_or("literal missing")?
        }
    }
    from_repr(_value) {
        todo!()
    }
}

// NAMED MODELS AND FIELDS //
serde_repr! {
    struct NamedModelDefinitionNodeRepr {
        kind: NamedModelDefinitionNodeKind = NamedModelDefinition,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        documentation: Option<StringDocToken>,
        modelName: String,
        r#type: Option<TypeNode>
    }
    for NamedModelDefinitionNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            modelName: node.name().map(|n| n.value().to_string()).ok_or("model name missing")?,
            r#type: node.ty()
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct NamedFieldDefinitionNodeRepr {
        kind: NamedFieldDefinitionNodeKind = NamedFieldDefinition,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        documentation: Option<StringDocToken>,
        fieldName: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        r#type: Option<TypeNode>
    }
    for NamedFieldDefinitionNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            fieldName: node.name().map(|n| n.value().to_string()).ok_or("field name missing")?,
            r#type: node.ty()
        }
    }
    from_repr(_value) {
        todo!()
    }
}

// TYPES //
// TODO: this node doesn't exist, but we need to bridge the current AST and revised tree implementation
#[derive(Serialize, Deserialize)]
enum NonNullDefinitionNodeKind {
    NonNullDefinition,
}
#[derive(Serialize, Deserialize)]
#[serde(untagged)]
enum NonNullDefinitionNodeRepr<T> {
    Required {
        kind: NonNullDefinitionNodeKind,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        location: Option<LocationSpan>,
        r#type: T,
    },
    Nullable(T),
}
macro_rules! non_null_type {
	(
		$node: expr,
		$inner_ty: ident {
			$($inner_field_name: ident: $inner_field_value: expr),+
			$(,)?
		}
	) => {
		if $node.required() {
			NonNullDefinitionNodeRepr::Required {
				kind: NonNullDefinitionNodeKind::NonNullDefinition,
				location: Some($node.location()),
				r#type: $inner_ty {
					kind: <$inner_ty>::KIND,
					location: Some($node.location()),
					$($inner_field_name: $inner_field_value),+
				}
			}
		} else {
			NonNullDefinitionNodeRepr::Nullable($inner_ty {
				kind: <$inner_ty>::KIND,
				location: Some($node.location()),
				$($inner_field_name: $inner_field_value),+
			})
		}
	};
}

serde_repr! {
    struct UnionTypeNodeRepr {
        kind: UnionTypeNodeKind = UnionDefinition,
        types: Vec<NonUnionTypeNode>
    }
    for UnionTypeNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            types: node.types().collect()
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct ObjectTypeNodeRepr {
        kind: ObjectTypeNodeKind = ObjectDefinition,
        fields: Vec<ObjectTypeFieldNode>
    }
}
serde_repr! {
    repr NonNullDefinitionNodeRepr<ObjectTypeNodeRepr>;
    for ObjectTypeNode;
    to_repr(node) {
        non_null_type!(node, ObjectTypeNodeRepr {
            fields: node.fields().collect()
        })
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct ObjectTypeFieldNodeRepr {
        kind: ObjectTypeFieldNodeKind = FieldDefinition,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        documentation: Option<StringDocToken>,
        fieldName: String,
        required: bool,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        r#type: Option<TypeNode>
    }
    for ObjectTypeFieldNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            fieldName: node.name().and_then(|n| n.value().map(|v| v.into_owned())).ok_or("field name missing")?,
            required: node.required(),
            r#type: node.ty()
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct ListTypeNodeRepr {
        kind: ListTypeNodeKind = ListDefinition,
        elementType: TypeNode
    }
}
serde_repr! {
    repr NonNullDefinitionNodeRepr<ListTypeNodeRepr>;
    for ListTypeNode;
    to_repr(node) {
        non_null_type!(node, ListTypeNodeRepr {
            elementType: node.ty().ok_or("type missing")?
        })
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct EnumTypeNodeRepr {
        kind: EnumTypeNodeKind = EnumDefinition,
        values: Vec<EnumTypeVariantNode>
    }
}
serde_repr! {
    repr NonNullDefinitionNodeRepr<EnumTypeNodeRepr>;
    for EnumTypeNode;
    to_repr(node) {
        non_null_type!(node, EnumTypeNodeRepr {
            values: node.variants().collect()
        })
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct EnumTypeVariantNodeRepr {
        kind: EnumTypeVariantNodeKind = EnumValue,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        documentation: Option<StringDocToken>,
        name: Option<String>,
        value: LiteralValue<'static>
    }
    for EnumTypeVariantNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            name: node.name().map(|n| n.value().to_string()),
            value: node.value().ok_or("value missing")?.to_owned()
        }
    }
    from_repr(_value) {
        todo!()
    }
}

serde_repr! {
    struct PrimitiveTypeNodeRepr {
        kind: PrimitiveTypeNodeKind = PrimitiveTypeName,
        name: PrimitiveTypeName
    }
}
serde_repr! {
    repr NonNullDefinitionNodeRepr<PrimitiveTypeNodeRepr>;
    for PrimitiveTypeNode;
    to_repr(node) {
        non_null_type!(node, PrimitiveTypeNodeRepr {
            name: node.name().ok_or("type name missing")?.value()
        })
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct NamedTypeNodeRepr {
        kind: NamedTypeNodeKind = ModelTypeName,
        name: String
    }
}
serde_repr! {
    repr NonNullDefinitionNodeRepr<NamedTypeNodeRepr>;
    for NamedTypeNode;
    to_repr(node) {
        non_null_type!(node, NamedTypeNodeRepr {
            name: node.name().map(|n| n.value().to_string()).ok_or("type name missing")?
        })
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct PrimitiveLiteralNodeRepr {
        kind: PrimitiveLiteralNodeKind = ComlinkPrimitiveLiteral + ComlinkNoneLiteral,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        value: Option<LiteralValue<'static>>
    }
    for PrimitiveLiteralNode;
    to_repr(node) {
        let value = node.value().ok_or("literal value missing")?.to_owned();
        match value {
            LiteralValue::None => Self {
                kind: PrimitiveLiteralNodeKind::ComlinkNoneLiteral,
                location: Some(node.location()),
                value: None
            },
            _ => Self {
                kind: PrimitiveLiteralNodeKind::ComlinkPrimitiveLiteral,
                location: Some(node.location()),
                value: Some(value)
            }
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct ListLiteralNodeRepr {
        kind: ListLiteralNodeKind = ComlinkListLiteral,
        items: Vec<LiteralNode>
    }
    for ListLiteralNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            items: node.elements().collect()
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct ObjectLiteralNodeRepr {
        kind: ObjectLiteralNodeKind = ComlinkObjectLiteral,
        fields: Vec<ObjectLiteralFieldNode>
    }
    for ObjectLiteralNode;
    to_repr(node) {
        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            fields: node.fields().collect()
        }
    }
    from_repr(_value) {
        todo!()
    }
}
serde_repr! {
    struct ObjectLiteralFieldNodeRepr {
        kind: ObjectLiteralFieldNodeKind = ComlinkAssignment,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        documentation: Option<StringDocToken>,
        key: Vec<String>,
        value: LiteralNode
    }
    for ObjectLiteralFieldNode;
    to_repr(node) {
        let mut key = Vec::new();
        for k in node.key() {
            key.push(
                k.value().ok_or("key missing")?.into_owned()
            );
        }

        Self {
            kind: Self::KIND,
            location: Some(node.location()),
            documentation: node.doc(),
            key,
            value: node.literal().ok_or("literal missing")?
        }
    }
    from_repr(_value) {
        todo!()
    }
}
