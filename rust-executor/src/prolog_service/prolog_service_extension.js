((globalThis) => {
    const core = Deno.core;

    globalThis.PROLOG_SERVICE = {
        spawnEngine: async (engineName) => {
            return core.opAsync("spawn_engine", engineName);
        },
        runQuery: async (engineName, query) => {
            if(!query.endsWith(".")) query = query+".";
            return JSON.parse(await core.opAsync("run_query", engineName, query));
        },
        loadModuleString: async (engineName, module_name, program) => {
            return core.opAsync("load_module_string", engineName, module_name, program);
        }
    };
  })(globalThis);
  