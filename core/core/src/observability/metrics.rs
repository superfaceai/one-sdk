/// Public module so that the macro can access it, but should not be used outside of the parent module.
pub mod __private {
    use std::collections::HashMap;

    use serde::Serialize;

    use tracing_subscriber::fmt::MakeWriter;

    #[derive(Debug, Serialize)]
    #[serde(tag = "event_type")]
    pub enum Event<'a> {
        #[serde(rename = "SDKInit")]
        SdkInit {
            occurred_at: &'a str,
            configuration_hash: Option<&'a str>,
            data: SdkInitData<'a>,
        },
        Metrics {
            occurred_at: &'a str,
            configuration_hash: Option<&'a str>,
            data: MetricsData<'a>,
        },
        Panic {
            occurred_at: &'a str,
            data: PanicData<'a>,
        },
    }

    #[derive(Debug, Serialize)]
    pub struct SdkInitData<'a> {
        pub configuration: SdkInitDataConfiguration<'a>,
    }
    #[derive(Debug, Serialize)]
    pub struct SdkInitDataConfiguration<'a> {
        pub profiles: HashMap<&'a str, ()>,
    }

    #[derive(Debug, Serialize)]
    pub struct MetricsData<'a> {
        pub from: &'a str,
        pub to: &'a str,
        pub metrics: [MetricsDataEntry<'a>; 1],
    }
    #[derive(Debug, Serialize)]
    #[serde(tag = "type")]
    pub enum MetricsDataEntry<'a> {
        PerformMetrics {
            profile: &'a str,
            provider: &'a str,
            successful_performs: usize,
            failed_performs: usize,
        },
    }

    #[derive(Debug, Serialize)]
    pub struct PanicData<'a> {
        pub message: &'a str,
        pub location: Option<PanicDataLocation<'a>>,
    }
    #[derive(Debug, Serialize)]
    pub struct PanicDataLocation<'a> {
        pub file: &'a str,
        pub line: u32,
        pub column: u32,
    }

    pub fn log_metric_event(event: impl Serialize) {
        let writer = unsafe {
            crate::observability::METRICS_BUFFER
                .as_ref()
                .unwrap()
                .make_writer()
        };

        serde_json::to_writer(writer, &event).unwrap();
    }
}

macro_rules! log_metric {
    (
        Init
        // TODO
    ) => {
        {
            use $crate::observability::metrics::{log_metric, __private::*};
            let now = log_metric!(__internal now());
            log_metric!(
                __internal common()
                Event::SdkInit {
                    occurred_at: &now,
                    configuration_hash: None,
                    data: SdkInitData {
                        configuration: SdkInitDataConfiguration { profiles: Default::default() }
                    }
                }
            );
        }
    };

    (
        Perform
        success = $is_success: expr,
        profile = $profile: expr,
        profile_url = $profile_url: expr,
        profile_content_hash = $profile_content_hash: expr,
        provider = $provider: expr,
        provider_url = $provider_url: expr,
        provider_content_hash = $provider_content_hash: expr,
        map_url = $map_url: expr,
        map_content_hash = $map_content_hash: expr
        $(,)?
    ) => {
        {
            use $crate::observability::metrics::{log_metric, __private::*};

            let now = log_metric!(__internal now());
            let (successful_performs, failed_performs) = if $is_success { (1, 0) } else { (0, 1) };
            log_metric!(
                __internal common()
                Event::Metrics {
                    occurred_at: &now,
                    configuration_hash: None,
                    data: MetricsData {
                        from: &now,
                        to: &now,
                        metrics: [MetricsDataEntry::PerformMetrics {
                            profile: $profile,
                            provider: $provider,
                            successful_performs,
                            failed_performs
                        }]
                    }
                }
            );
        }
    };

    (
        Panic
        message = $message: expr,
        location = $location: expr
        $(,)?
    ) => {
        {
            use $crate::observability::metrics::{log_metric, __private::*};

            let now = log_metric!(__internal now());
            // log_metric!(
            //     __internal common()
            //     Event::Panic {
            //         occurred_at: &now,
            //         data: PanicData {
            //             message: $message
            //         }
            //     }
            // );
            // TODO: implement Panic metric in brain?
            tracing::info!(
                target: "@metrics",
                event = ?Event::Panic {
                    occurred_at: &now,
                    data: PanicData {
                        message: $message,
                        location: $location.map(|(file, line, column)| PanicDataLocation { file, line, column })
                    }
                }
            );
        }
    };

    (
        __internal common()
        $event: expr
    ) => {
        tracing::info!(
            target: "@metrics",
            event = ?$event
        );
        $crate::observability::metrics::__private::log_metric_event($event);
    };

    (__internal now()) => {
        chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
    };
}

// TIL trick to make scoped crate-wide macros
pub(crate) use log_metric;
