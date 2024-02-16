use serde::{Deserialize, Serialize};
use juniper::GraphQLObject;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthInfoExtended {
    pub request_id: String,
    auth: AuthInfo,
}

#[derive(GraphQLObject, Default, Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AuthInfo {
    pub app_name: String,
    pub app_desc: String,
    pub app_domain: Option<String>,
    pub app_url: Option<String>,
    pub app_icon_path: Option<String>,
    pub capabilities: Option<Vec<Capability>>,
}

impl From<crate::graphql::graphql_types::AuthInfoInput> for AuthInfo {
    fn from(input: crate::graphql::graphql_types::AuthInfoInput) -> Self {
        Self {
            app_name: input.app_name,
            app_desc: input.app_desc,
            app_domain: Some(input.app_domain),
            app_url: input.app_url,
            app_icon_path: input.app_icon_path,
            capabilities: input.capabilities
                .map(|vec| vec.into_iter().map(|c| c.into()).collect()),
        }
    }
}

#[derive(GraphQLObject, Default, Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Capability {
    pub with: Resource,
    pub can: Vec<String>,
}

impl From<crate::graphql::graphql_types::CapabilityInput> for Capability {
    fn from(input: crate::graphql::graphql_types::CapabilityInput) -> Self {
        Self {
            with: input.with.into(),
            can: input.can,
        }
    }
}

#[derive(GraphQLObject, Default, Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Resource {
    pub domain: String,
    pub pointers: Vec<String>,
}

impl From<crate::graphql::graphql_types::ResourceInput> for Resource {
    fn from(input: crate::graphql::graphql_types::ResourceInput) -> Self {
        Self {
            domain: input.domain,
            pointers: input.pointers,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    iss: String,
    aud: String,
    exp: u64,
    iat: u64,
    pub capabilities: AuthInfo,
}

impl Claims {
    pub fn new(issuer: String, audience: String, expiration_time: u64, capabilities: AuthInfo) -> Self {
        let now = SystemTime::now();
        let unix_timestamp = now
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs();

        Claims {
            iss: issuer,
            aud: audience,
            exp: unix_timestamp + expiration_time,
            iat: unix_timestamp,
            capabilities,
        }
    }
}

