use std::borrow::Cow;

/// For the purposes of metrics we are interested in some data which may or may not be parsed out of the profile, provider and map.
///
/// If the perform ends successfully or with a maped error these fields will be available. If it ends with an exception some of these fields might not be available.
#[derive(Debug, Default)]
#[allow(dead_code)] // TODO: until we use these fields
pub struct PerformMetricsData<'a> {
    /// Profile id in format `<scope>/<name>`
    pub profile: Option<&'a str>,
    /// Profile url as passed into perform
    pub profile_url: &'a str,
    /// Profile version as parsed from the profile header
    pub profile_version: Option<String>,
    pub profile_content_hash: Option<&'a str>,
    /// Provider name
    pub provider: Option<&'a str>,
    /// Provider url as passed into perform
    pub provider_url: &'a str,
    pub provider_content_hash: Option<&'a str>,
    /// Map url as passed into perform
    pub map_url: &'a str,
    /// Map version as parsed from map metadata
    pub map_version: Option<String>,
    pub map_content_hash: Option<&'a str>,
}
impl<'a> PerformMetricsData<'a> {
    pub fn get_profile(&self) -> Cow<'_, str> {
        match self.profile {
            Some(profile) => Cow::Borrowed(profile),
            None => Cow::Owned(
                self.profile_url
                    .split('/')
                    .last()
                    .and_then(|b| b.strip_suffix(".profile"))
                    .unwrap()
                    .replace('.', "/"),
            ),
        }
    }

    pub fn get_provider(&self) -> &str {
        match self.provider {
            Some(provider) => provider,
            None => self
                .provider_url
                .split('/')
                .last()
                .and_then(|b| b.strip_suffix(".provider.json"))
                .unwrap(),
        }
    }
}
