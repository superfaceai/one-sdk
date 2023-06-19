// 'SDKInit' | 'Metrics' | 'ProviderChange'
//
macro_rules! log_metric {
	() => {
		tracing::info!(
			target: "@metrics",
			occured_at = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
			kind = "TODO",
		)
	};
}

// TIL trick to make scoped crate-wide macros
pub(crate) use log_metric;
