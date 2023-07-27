mod config;
mod globals;
pub mod graphql;
mod holochain_service;
mod js_core;
mod utils;
mod wallet;
use tokio;


pub mod init;
mod pubsub;

use std::env;
use tracing::{info, error};

//use graphql::start_server;
use js_core::JsCore;

pub use config::Ad4mConfig;

/// Runs the GraphQL server and the deno core runtime
pub async fn run(mut config: Ad4mConfig) {
    env::set_var("RUST_LOG", "rust_executor=info,warp::server");
    let _ = env_logger::try_init();
    config.prepare();

    info!("Starting js_core...");
    let mut js_core_handle = JsCore::start(config.clone()).await;
    js_core_handle.initialized().await;
    info!("js_core initialized.");

    info!("Starting GraphQL...");

    match graphql::start_server(
        js_core_handle,
        config.gql_port.expect("Did not get gql port"),
    )
    .await
    {
        Ok(_) => {
            info!("GraphQL server stopped.");
            std::process::exit(0);
        }
        Err(err) => {
            error!("GraphQL server stopped with error: {}", err);
            std::process::exit(1);
        }
    };
}

/// Runs the GraphQL server and the deno core runtime
pub async fn run_with_tokio(mut config: Ad4mConfig) {
    env::set_var("RUST_LOG", "rust_executor=info,warp::server");
    let _ = env_logger::try_init();
    config.prepare();

    info!("Starting js_core...");
    let mut js_core_handle = JsCore::start(config.clone()).await;
    js_core_handle.initialized().await;
    info!("js_core initialized.");

    info!("Starting GraphQL...");

    tokio::task::spawn_blocking(move || {
        let result = graphql::start_server(
            js_core_handle,
            config.gql_port.expect("Did not get gql port"),
        );
        tokio::runtime::Handle::current().block_on(async {
            match result.await {
                Ok(_) => {
                    info!("GraphQL server stopped.");
                    std::process::exit(0);
                }
                Err(err) => {
                    error!("GraphQL server stopped with error: {}", err);
                    std::process::exit(1);
                }
            }
        });
    });
}
