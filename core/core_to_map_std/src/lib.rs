//! # Core <-> Integration communication
//!
//! This can be understood as the standard library provided by Core to the Integration.
//!
//! This module contains implementation of the stdlib, but not the bindings between the interpreter machine and core.

/// Defines message exchange initiated from map to core.
///
/// Response enums are scoped only to the handler code following the definition, so they don't pollute the namespace.
///
/// Handlers have access to all fields of the message and the `state` variable.
///
/// ```
/// define_exchange! {
/// 	let state: StateTrait;
/// 	enum MessageUnstable<'a> {
/// 		GetInput ->
/// 		#[derive(Clone)]
/// 		enum Response {
/// 			Ok { value: usize }
/// 		} => { Response::Ok { value: state.get_input() } },
/// 		HttpCall {
/// 			method: &'a str,
/// 			url: &'a str
/// 		} -> enum Response {
/// 			Ok { handle: usize },
/// 			Err { error: String }
/// 		} => match state.handle_http_call(method, url) {
/// 			Ok(handle) => Response::Ok { handle },
/// 			Err(err) => Response::Err { error: err.to_string() }
/// 		}
/// 	}
/// }
/// ```
macro_rules! define_exchange_map_to_core {
	(
		let $state_name: ident: $state_trait: path;
		$( #[$in_attr: meta] )*
		enum $receiver_enum: ident $(<$life: lifetime>)? {
			$(
				$in_name: ident $({
          $(
						$( #[$in_field_attr: meta] )*
						$in_field_name: ident : $in_field_type: ty
					),+ $(,)?
        })? ->
				$( #[$out_attr: meta] )*
				enum $out_name: ident {
					$(
						$out_variant_name: ident $({
							$(
								$( #[$out_field_attr: meta] )*
								$out_field_name: ident : $out_field_type: ty
							),+ $(,)?
						})?
					),+ $(,)?
				} => $handler: expr
			),+ $(,)?
		}
	) => {
		$( #[$in_attr] )*
		#[derive(Deserialize)]
		#[serde(tag = "kind")]
		#[serde(rename_all = "kebab-case")]
		enum $receiver_enum $(<$life>)? {
			$(
				$in_name $({
                    $( $( #[$in_field_attr] )* $in_field_name : $in_field_type ),+
                })?
			),+
		}
		impl $(<$life>)? $receiver_enum $(<$life>)? {
			pub fn handle($state_name: &mut impl $state_trait, message: & $($life)? [u8]) -> String {
				match serde_json::from_slice::<$receiver_enum>(message) {
					Err(err) => {
						let error = serde_json::json!({
							"kind": "err",
							"error": format!("Failed to deserialize {} message: {}", stringify!($receiver_enum), err)
						});
						serde_json::to_string(&error)
					}
					$(
						Ok(Self::$in_name $({ $($in_field_name),+ })?) => {
							$( #[$out_attr] )*
							#[derive(Serialize)]
							#[serde(tag = "kind")]
							#[serde(rename_all = "kebab-case")]
							enum $out_name {
								$(
									$out_variant_name $({
										$( $( #[$out_field_attr] )* $out_field_name : $out_field_type ),+
									})?
								),+
							}

							let response = $handler;

							serde_json::to_string(&response)
						}
					)+
				}.unwrap()
			}
		}
	};
}

pub mod unstable;

pub trait CoreToMapStd: unstable::MapStdUnstable {}

use unstable::{security::SecurityMap, MapValue};

#[derive(Debug, thiserror::Error)]
pub enum MapInterpreterRunError {
    // TODO
    #[error("{0}")]
    Error(String),
    #[error("Map code cannot be an empty string")]
    MapCodeEmpty,
}
pub trait MapInterpreter {
    fn run(
        &mut self,
        code: &[u8],
        usecase: &str,
        input: MapValue,
        parameters: MapValue,
        services: MapValue,
        security: SecurityMap,
    ) -> Result<Result<MapValue, MapValue>, MapInterpreterRunError>;
}
