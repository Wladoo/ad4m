import * as path from 'path';
import * as fs from 'fs';
import { Address, Expression } from '@perspect3vism/ad4m';

export let ad4mExecutorVersion = process.env.npm_package_version;
export let agentLanguageAlias = "did";
export let languageLanguageAlias = "lang";
export let neighbourhoodLanguageAlias = "neighbourhood";
export let perspectiveLanguageAlias = "perspective";

export class MainConfig {
    rootConfigPath: string;
    dataPath: string;
    languagesPath: string;
    tempLangPath: string;
    holochainPath: string;
    holochainDataPath: string;
    holochainConductorPath: string;
    resourcePath: string = '';
    languageLanguageOnly: boolean = false;
    reqCredential: string = '';
    knownLinkLanguages: string[] = [];
    trustedAgents: string[] =  [];
    systemLanguages: string[] = [];
    preloadLanguages: string[] = [];
    languageLanguageBundle: string = '';
    directMessageLanguage: string = '';
    languageAliases: LanguageAlias = {};
    bootstrapFixtures: BootstrapFixtures | null = null;
    directMessageLanguageSettings: object | null = null;
    agentLanguageSettings: object | null = null;
    perspectiveLanguageSettings: object | null = null;
    neighbourhoodLanguageSettings: object | null = null;
    languageLanguageSettings: object | null = null;
    swiplPath: string | null = null;
    swiplHomePath: string | null = null;

    constructor(resourcePath = '', appDataPath = '') {
        this.resourcePath = resourcePath;
        this.rootConfigPath = path.join(appDataPath, 'ad4m');
        this.dataPath = path.join(this.rootConfigPath, 'data')
        this.languagesPath = path.join(this.rootConfigPath, 'languages')
        this.tempLangPath = path.join(this.languagesPath, "temp")
        this.holochainPath = path.join(this.rootConfigPath, 'h')
        this.holochainDataPath = path.join(this.holochainPath, 'd')
        this.holochainConductorPath = path.join(this.holochainPath, 'c')
    }
}

export type LanguageAlias = {
    [key: string]: Address;
}

export interface CoreConfig {
    appDataPath: string
    appResourcePath: string
    languageLanguageBundle: string
    systemLanguages: string[]
    preloadLanguages: string[]
    directMessageLanguage: string
    knownLinkLanguages: string[]
    trustedAgents: string[]
    languageLanguageOnly: boolean
    languageAliases?: LanguageAlias
    bootstrapFixtures?: BootstrapFixtures
    directMessageLanguageSettings?: object
    agentLanguageSettings?: object
    perspectiveLanguageSettings?: object
    neighbourhoodLanguageSettings?: object
    languageLanguageSettings?: object
    reqCredential?: string
    swiplPath?: string,
    swiplHomePath?: string,
}


export function init(c: CoreConfig): MainConfig {
    const mainConfig = new MainConfig(c.appResourcePath, c.appDataPath);

    if(c.reqCredential) {
        mainConfig.reqCredential = c.reqCredential
    }

    //Create paths if they do not exist
    const dirs = [mainConfig.rootConfigPath, mainConfig.dataPath, mainConfig.languagesPath, mainConfig.tempLangPath, mainConfig.holochainPath, mainConfig.holochainDataPath, mainConfig.holochainConductorPath]
    for(const d of dirs)
    if(!fs.existsSync(d)) {
        fs.mkdirSync(d)
    }

    mainConfig.systemLanguages = c.systemLanguages
    mainConfig.preloadLanguages = c.preloadLanguages
    if(c.languageAliases)
        mainConfig.languageAliases = c.languageAliases

    if (c.bootstrapFixtures) {
        mainConfig.bootstrapFixtures = c.bootstrapFixtures!;
    } else {
        mainConfig.bootstrapFixtures = null
    }
    mainConfig.directMessageLanguage = c.directMessageLanguage
    mainConfig.knownLinkLanguages = c.knownLinkLanguages
    mainConfig.trustedAgents = c.trustedAgents
    mainConfig.languageLanguageOnly = c.languageLanguageOnly;
    mainConfig.languageLanguageBundle = c.languageLanguageBundle;

    if (c.directMessageLanguageSettings) {
        mainConfig.directMessageLanguageSettings = c.directMessageLanguageSettings
    }
    if (c.agentLanguageSettings) {
        mainConfig.agentLanguageSettings = c.agentLanguageSettings
    }
    if (c.perspectiveLanguageSettings) {
        mainConfig.perspectiveLanguageSettings = c.perspectiveLanguageSettings
    }
    if (c.neighbourhoodLanguageSettings) {
        mainConfig.neighbourhoodLanguageSettings = c.neighbourhoodLanguageSettings
    }
    if (c.languageLanguageSettings) {
        mainConfig.languageLanguageSettings = c.languageLanguageSettings
    }

    return mainConfig;
}

export class BootstrapFixtures {
    languages?: BootstrapLanguageFixture[]
    perspectives?: BootstrapPerspectiveFixture[]
}

export class BootstrapLanguageFixture {
    address?: string
    meta?: Expression
    bundle?: string
}

export class BootstrapPerspectiveFixture {
    address?: string
    expression?: Expression
}