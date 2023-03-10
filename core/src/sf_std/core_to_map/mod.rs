//! # Core <-> Integration communication
//!
//! This can be understood as the standard library provided by Core to the Integration.
//!
//! This module contains implementation of the stdlib, but not the bindings between the interpreter machine and core.

/// Defines message exchange initiated from map to core.
///
/// ```
/// define_exchange! {
/// 	enum MessageUnstable<'a> {
/// 		GetInput ->
/// 		#[derive(Clone)]
/// 		enum OutGetInput {
/// 			Ok { value: usize }
/// 		},
/// 		HttpCall {
/// 			method: &'a str,
/// 			url: &'a str
/// 		} -> enum OutHttpCall {
/// 			Ok { handle: usize },
/// 			Err { error: String }
/// 		}
/// 	}
/// }
/// ```
macro_rules! define_exchange_map_to_core {
	(
		$( #[$in_attr: meta] )*
		enum $receiver_enum: ident $(< $($lifetimes: lifetime),+ $(,)?>)? {
			$(
				$in_name: ident $({
                    $(
						$( #[$in_field_attr: meta] )*
						$in_field_name: ident : $in_field_type: ty
					),+ $(,)?
                })?
				->
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
				}
			),+ $(,)?
		}
	) => {
		$( #[$in_attr] )*
		#[derive(Deserialize)]
		#[serde(tag = "kind")]
		#[serde(rename_all = "kebab-case")]
		enum $receiver_enum $(< $($lifetimes),+ >)? {
			$(
				$in_name $({
                    $( $( #[$in_field_attr] )* $in_field_name : $in_field_type ),+
                })?
			),+
		}
		$(
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
		)+
	};
}

pub mod unstable;
