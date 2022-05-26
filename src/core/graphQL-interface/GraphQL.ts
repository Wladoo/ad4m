import { ApolloServer, withFilter, gql, AuthenticationError } from 'apollo-server'
import { Agent, Expression, InteractionCall, LanguageRef } from '@perspect3vism/ad4m'
import { exprRef2String, parseExprUrl, LanguageMeta } from '@perspect3vism/ad4m'
import { typeDefsString } from '@perspect3vism/ad4m/lib/src/typeDefs'
import type PerspectivismCore from '../PerspectivismCore'
import * as Config from "../Config";
import * as PubSub from './PubSub'
import { GraphQLScalarType } from "graphql";
import { ad4mExecutorVersion } from '../Config';
import * as Auth from '../agent/Auth'
import { checkCapability } from '../agent/Auth'

function createResolvers(core: PerspectivismCore) {
    const pubsub = PubSub.get()

    return {
        Query: {
            //@ts-ignore
            agent: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.AGENT_READ_CAPABILITY)
                return core.agentService.agent
            },
            //@ts-ignore
            agentByDID: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.AGENT_READ_CAPABILITY)
                const { did } = args;
                const agentLanguage = core.languageController.getAgentLanguage().expressionAdapter;
                if (!agentLanguage) {
                    throw Error("Agent language does not have an expression adapter")
                }
                const expr = await agentLanguage.get(did);
                if (expr != null) {
                    return expr.data;
                } else {
                    return null
                }
            },
            //@ts-ignore
            agentStatus: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.AGENT_READ_CAPABILITY)
                return core.agentService.dump()
            },
            //@ts-ignore
            expression: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.EXPRESSION_READ_CAPABILITY)
                const url = args.url.toString();
                const ref = parseExprUrl(url)
                const expression = await core.languageController.getExpression(ref);
                if(expression) {
                    expression.ref = ref
                    expression.url = url
                    expression.data = JSON.stringify(expression.data)
                }
                return expression
            },
            //@ts-ignore
            expressionMany: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.EXPRESSION_READ_CAPABILITY)
                const { urls } = args;
                const expressionPromises = [];
                for (const url of urls) {
                    expressionPromises.push(core.languageController.getExpression(parseExprUrl(url)));
                };
                const results = await Promise.all(expressionPromises);

                return results.map((expression: Expression|null, index) => {
                    if(expression) {
                        expression.ref = parseExprUrl(urls[index]);
                        expression.url = urls[index];
                        expression.data = JSON.stringify(expression.data);
                    }
                    return expression
                })
            },
            //@ts-ignore
            expressionRaw: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.EXPRESSION_READ_CAPABILITY)
                const ref = parseExprUrl(args.url.toString())
                const expression = await core.languageController.getExpression(ref) as any
                return JSON.stringify(expression)
            },
            //@ts-ignore
            expressionInteractions: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.EXPRESSION_READ_CAPABILITY)
                const { url } = args
                const result = await core.languageController.expressionInteractions(url)
                return result
            },
            //@ts-ignore
            language: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.LANGUAGE_READ_CAPABILITY)
                const { address } = args
                const lang = await core.languageController.languageByRef({address, name: ""} as LanguageRef) as any
                lang.address = address
                return lang
            },
            //@ts-ignore
            languageMeta: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.LANGUAGE_READ_CAPABILITY)
                const { address } = args
                const languageExpression = await core.languageController.getLanguageExpression(address)
                if(!languageExpression)
                    throw new Error(`Language not found: ${address}`)
                const internal = languageExpression.data
                let meta = new LanguageMeta()
                meta.name = internal.name
                meta.address = address
                meta.description = internal.description
                meta.author = languageExpression.author
                meta.templated = internal.templateSourceLanguageAddress != undefined
                meta.templateSourceLanguageAddress = internal.templateSourceLanguageAddress
                meta.templateAppliedParams = internal.templateAppliedParams
                meta.possibleTemplateParams = internal.possibleTemplateParams
                meta.sourceCodeLink = internal.sourceCodeLink
                
                return meta
            },

            //@ts-ignore
            languageSource: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.LANGUAGE_READ_CAPABILITY)
                const { address } = args
                const languageSource = await core.languageController.getLanguageSource(address)
                if(!languageSource)
                    throw new Error(`Language not found: ${address}`)

                return languageSource
            },
            
            //@ts-ignore
            languages: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.LANGUAGE_READ_CAPABILITY)
                let filter
                if(args.filter && args.filter !== '') filter = args.filter
                return core.languageController.filteredLanguageRefs(filter)
            },
            //@ts-ignore
            perspective: (parent, args, context, info) => {
                const id = args.uuid
                checkCapability(context.capabilities, Auth.perspectiveQueryCapability([id]))
                return core.perspectivesController.perspectiveID(id)
            },
            //@ts-ignore
            perspectiveQueryLinks: async (parent, args, context, info) => {
                const { uuid, query } = args
                checkCapability(context.capabilities, Auth.perspectiveQueryCapability([uuid]))
                const perspective = core.perspectivesController.perspective(uuid)
                //console.log("querying on", perspective, query, uuid);
                return await perspective.getLinks(query)
            },
            //@ts-ignore
            perspectiveQueryProlog: async (parent, args, context, info) => {
                const { uuid, query } = args
                checkCapability(context.capabilities, Auth.perspectiveQueryCapability([uuid]))
                const perspective = core.perspectivesController.perspective(uuid)
                return JSON.stringify(await perspective.prologQuery(query))
            },
            //@ts-ignore
            perspectiveSnapshot: async (parent, args, context, info) => {
                const id = args.uuid
                checkCapability(context.capabilities, Auth.perspectiveQueryCapability([id]))
                return await core.perspectivesController.perspectiveSnapshot(id)
            },
            //@ts-ignore
            perspectives: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.perspectiveQueryCapability(["*"]))
                return core.perspectivesController.allPerspectiveHandles()
            },
            //@ts-ignore
            getTrustedAgents: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_TRUSTED_AGENTS_READ_CAPABILITY)
                return core.runtimeService.getTrustedAgents();
            },

            //@ts-ignore
            runtimeKnownLinkLanguageTemplates: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_KNOWN_LINK_LANGUAGES_READ_CAPABILITY)
                return core.runtimeService.knowLinkLanguageTemplates();
            },

            //@ts-ignore
            runtimeFriends: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_FRIENDS_READ_CAPABILITY)
                return core.runtimeService.friends();
            },

            //@ts-ignore
            runtimeHcAgentInfos: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_HC_AGENT_INFO_READ_CAPABILITY)
                return JSON.stringify(await core.holochainRequestAgentInfos())
            },

            //@ts-ignore
            runtimeFriendStatus: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_FRIEND_STATUS_READ_CAPABILITY)
                const { did } = args
                if(!core.runtimeService.friends().includes(did)) throw `${did} is not a friend`
                const dmLang = await core.friendsDirectMessageLanguage(did)
                if(dmLang)
                    return await dmLang.directMessageAdapter!.status()
                else
                    return undefined
            },

            //@ts-ignore
            runtimeMessageInbox: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_MESSAGES_READ_CAPABILITY)
                const { filter } = args
                const dmLang = await core.myDirectMessageLanguage()
                return await dmLang.directMessageAdapter!.inbox(filter)
            },
            //@ts-ignore
            runtimeMessageOutbox: (parent, args, context, info) => {
                console.log("runtimeMessageOutbox")
                checkCapability(context.capabilities, Auth.RUNTIME_MESSAGES_READ_CAPABILITY)
                const { filter } = args
                return core.runtimeService.getMessagesOutbox(filter)
            },
            //@ts-ignore
            runtimeInfo: (parent, args) => {
                return {
                    ad4mExecutorVersion: ad4mExecutorVersion,
                }
            }
        },
        Mutation: {
            //@ts-ignore
            addTrustedAgents: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_TRUSTED_AGENTS_CREATE_CAPABILITY)
                const { agents } = args;
                core.runtimeService.addTrustedAgents(agents);
                return core.runtimeService.getTrustedAgents();
            },
            //@ts-ignore
            deleteTrustedAgents: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_TRUSTED_AGENTS_DELETE_CAPABILITY)
                const { agents } = args;
                core.runtimeService.deleteTrustedAgents(agents);
                return core.runtimeService.getTrustedAgents();
            },
            //@ts-ignore
            runtimeAddKnownLinkLanguageTemplates: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_KNOWN_LINK_LANGUAGES_CREATE_CAPABILITY)
                const { addresses } = args;
                core.runtimeService.addKnowLinkLanguageTemplates(addresses);
                return core.runtimeService.knowLinkLanguageTemplates();
            },
            //@ts-ignore
            runtimeRemoveKnownLinkLanguageTemplates: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_KNOWN_LINK_LANGUAGES_DELETE_CAPABILITY)
                const { addresses } = args;
                core.runtimeService.removeKnownLinkLanguageTemplates(addresses);
                return core.runtimeService.knowLinkLanguageTemplates();
            },
            //@ts-ignore
            runtimeAddFriends: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_FRIENDS_CREATE_CAPABILITY)
                const { dids } = args;
                core.runtimeService.addFriends(dids);
                //@ts-ignore
                await Promise.all(dids.map(did => core.friendsDirectMessageLanguage(did)))
                return core.runtimeService.friends();
            },
            //@ts-ignore
            runtimeRemoveFriends: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_FRIENDS_DELETE_CAPABILITY)
                const { dids } = args;
                core.runtimeService.removeFriends(dids);
                return core.runtimeService.friends();
            },
            //@ts-ignore
            agentGenerate: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.AGENT_CREATE_CAPABILITY)
                await core.agentService.createNewKeys()
                await core.agentService.save(args.passphrase)
                if (!Config.languageLanguageOnly) {await core.initializeAgentsDirectMessageLanguage() }
                return core.agentService.dump()
            },
            //@ts-ignore
            agentImport: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.AGENT_CREATE_CAPABILITY)
                const { did, didDocument, keystore, passphrase } = args;
                await core.agentService.initialize(did, didDocument, keystore, passphrase)
                return core.agentService.dump()
            },
            //@ts-ignore
            agentLock: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.AGENT_LOCK_CAPABILITY)
                core.agentService.lock(args.passphrase)
                return core.agentService.dump()
            },
            //@ts-ignore
            agentUnlock:  async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.AGENT_UNLOCK_CAPABILITY)
                let failed = false
                try {
                    await core.agentService.unlock(args.passphrase)
                } catch(e) {
                    failed = true
                }

                const dump = core.agentService.dump() as any

                if(failed) {
                    dump.error = "Wrong passphrase"
                }

                return dump
            },
            //@ts-ignore
            agentUpdateDirectMessageLanguage: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.AGENT_UPDATE_CAPABILITY)
                const { directMessageLanguage } = args;
                let currentAgent = core.agentService.agent;
                if (!currentAgent) {
                    throw Error("No current agent init'd")
                }
                currentAgent.directMessageLanguage = directMessageLanguage;
                await core.agentService.updateAgent(currentAgent);
                return currentAgent;
            },
            //@ts-ignore
            agentUpdatePublicPerspective: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.AGENT_UPDATE_CAPABILITY)
                const {perspective} = args;
                let currentAgent = core.agentService.agent;
                if (!currentAgent) {
                    throw Error("No current agent init'd")
                }
                currentAgent.perspective = perspective;
                await core.agentService.updateAgent(currentAgent);
                return currentAgent;
            },
            //@ts-ignore
            agentRequestCapability: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.AGENT_AUTH_CAPABILITY)
                const { appName, appDesc, appUrl, capabilities } = args;
                let token = core.agentService.requestCapability(appName, appDesc, appUrl, capabilities);
                return token;
            },
            //@ts-ignore
            agentPermitCapability: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.AGENT_PERMIT_CAPABILITY)
                const { auth } = args;
                return core.agentService.permitCapability(auth, context.capabilities);
            },
            //@ts-ignore
            agentGenerateJwt: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.AGENT_AUTH_CAPABILITY)
                const { requestId, rand } = args;
                let jwt = await core.agentService.generateJwt(requestId, rand)
                return jwt;
            },
            //@ts-ignore
            expressionCreate: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.EXPRESSION_CREATE_CAPABILITY)
                const { languageAddress, content } = args
                const langref = { address: languageAddress } as LanguageRef
                const expref = await core.languageController.expressionCreate(langref, JSON.parse(content))
                return exprRef2String(expref)
            },
            //@ts-ignore
            expressionInteract: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.EXPRESSION_UPDATE_CAPABILITY)
                let { url, interactionCall } = args
                interactionCall = new InteractionCall(interactionCall.name, JSON.parse(interactionCall.parametersStringified))
                const result = await core.languageController.expressionInteract(url, interactionCall)
                return result
            },
            //@ts-ignore
            languageApplyTemplateAndPublish: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.LANGUAGE_CREATE_CAPABILITY)
                const { sourceLanguageHash, templateData } = args;
                return await core.languageApplyTemplateAndPublish(sourceLanguageHash, JSON.parse(templateData));
            },
            //@ts-ignore
            languagePublish: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.LANGUAGE_CREATE_CAPABILITY)
                const { languagePath, languageMeta } = args;
                const expression = await core.languagePublish(languagePath, languageMeta);
                const internal = expression.data
                let meta = new LanguageMeta()
                meta.name = internal.name
                meta.address = internal.address
                meta.description = internal.description
                meta.author = expression.author
                meta.templated = internal.templateSourceLanguageAddress != undefined
                meta.templateSourceLanguageAddress = internal.templateSourceLanguageAddress
                meta.templateAppliedParams = internal.templateAppliedParams
                meta.possibleTemplateParams = internal.possibleTemplateParams
                meta.sourceCodeLink = internal.sourceCodeLink
                return meta
            },
            //@ts-ignore
            languageWriteSettings: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.LANGUAGE_UPDATE_CAPABILITY)
                const { languageAddress, settings } = args
                await core.languageController.putSettings(languageAddress, JSON.parse(settings))
                return true
            },
            //@ts-ignore
            neighbourhoodJoinFromUrl: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.NEIGHBOURHOOD_READ_CAPABILITY)
                checkCapability(context.capabilities, Auth.PERSPECTIVE_CREATE_CAPABILITY)
                const { url } = args;
                try{
                    return await core.installNeighbourhood(url);
                } catch(e) {
                    console.error(`Error while trying to join neighbourhood '${url}':`, e)
                    throw e
                }
                
            },
            //@ts-ignore
            neighbourhoodPublishFromPerspective: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.NEIGHBOURHOOD_CREATE_CAPABILITY)
                const { linkLanguage, meta, perspectiveUUID } = args
                const perspective = core.perspectivesController.perspective(perspectiveUUID)
                if(perspective.neighbourhood && perspective.sharedUrl)
                    throw new Error(`Perspective ${perspective.name} (${perspective.uuid}) is already shared`);

                try{
                    return await core.neighbourhoodPublishFromPerspective(perspectiveUUID, linkLanguage, meta)
                } catch(e) {
                    console.error(`Error while trying to publish:`, e)
                    throw e
                }
                
            },
            //@ts-ignore
            perspectiveAdd: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.PERSPECTIVE_CREATE_CAPABILITY)
                const { name } = args;
                return core.perspectivesController.add(name)
            },
            //@ts-ignore
            perspectiveAddLink: (parent, args, context, info) => {
                const { uuid, link } = args
                checkCapability(context.capabilities, Auth.perspectiveUpdateCapability([uuid]))
                const perspective = core.perspectivesController.perspective(uuid)
                return perspective.addLink(link)
            },
            //@ts-ignore
            perspectiveRemove: (parent, args, context, info) => {
                const { uuid } = args
                checkCapability(context.capabilities, Auth.perspectiveDeleteCapability([uuid]))
                core.perspectivesController.remove(uuid)
                return true
            },
            //@ts-ignore
            perspectiveRemoveLink: (parent, args, context, info) => {
                // console.log("GQL| removeLink:", args)
                const { uuid, link } = args
                checkCapability(context.capabilities, Auth.perspectiveUpdateCapability([uuid]))
                const perspective = core.perspectivesController.perspective(uuid)
                perspective.removeLink(link)
                return true
            },
            //@ts-ignore
            perspectiveUpdate: (parent, args, context, info) => {
                const { uuid, name } = args
                checkCapability(context.capabilities, Auth.perspectiveUpdateCapability([uuid]))
                return core.perspectivesController.update(uuid, name);
            },
            //@ts-ignore
            perspectiveUpdateLink: (parent, args, context, info) => {
                const { uuid, oldLink, newLink } = args
                checkCapability(context.capabilities, Auth.perspectiveUpdateCapability([uuid]))
                const perspective = core.perspectivesController.perspective(uuid)
                return perspective.updateLink(oldLink, newLink)
            },
            //@ts-ignore
            runtimeOpenLink: (parent, args) => {
                const { url } = args
                console.log("openLinkExtern:", url)
                //shell.openExternal(url)
                return true
            },
            //@ts-ignore
            runtimeQuit: (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_QUIT_CAPABILITY)
                process.exit(0)
                return true
            },
            //@ts-ignore
            runtimeHcAddAgentInfos: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_HC_AGENT_INFO_CREATE_CAPABILITY)
                const { agentInfos } = args
                //@ts-ignore
                const parsed = JSON.parse(agentInfos).map(info => {
                    return {
                        //@ts-ignore
                        agent: Buffer.from(info.agent.data),
                        //@ts-ignore
                        signature: Buffer.from(info.signature.data),
                        //@ts-ignore
                        agent_info: Buffer.from(info.agent_info.data)
                    }
                })

                await core.holochainAddAgentInfos(parsed)
                return true
            },

            //@ts-ignore
            runtimeSetStatus: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_MY_STATUS_UPDATE_CAPABILITY)
                const { status } = args
                const dmLang = await core.myDirectMessageLanguage()
                await dmLang.directMessageAdapter!.setStatus(status)
                return true
            },

            //@ts-ignore
            runtimeFriendSendMessage: async (parent, args, context, info) => {
                checkCapability(context.capabilities, Auth.RUNTIME_MY_STATUS_UPDATE_CAPABILITY)
                const { did, message } = args
                if(!core.runtimeService.friends().includes(did)) throw `${did} is not a friend`
                const dmLang = await core.friendsDirectMessageLanguage(did)
                if(!dmLang) return false

                let wasSent = false
                let messageExpression
                try {
                    const status = await dmLang.directMessageAdapter!.status()
                    if(status) {
                        messageExpression = await dmLang.directMessageAdapter!.sendP2P(message)
                        wasSent = true
                    } else {
                        throw "Friends seems offline"
                    }
                } catch(e) {
                    messageExpression = await dmLang.directMessageAdapter!.sendInbox(message)
                    wasSent = true
                }

                if(wasSent && messageExpression) {
                    core.runtimeService.addMessageOutbox(did, messageExpression)
                }
                return wasSent
            }

        },

        Subscription: {
            agentUpdated: {
                //@ts-ignore
                subscribe: (parent, args, context, info) => {
                    checkCapability(context.capabilities, Auth.AGENT_SUBSCRIBE_CAPABILITY)
                    return pubsub.asyncIterator(PubSub.AGENT_UPDATED)
                },
                //@ts-ignore
                resolve: payload => payload
            },
            runtimeMessageReceived: {
                //@ts-ignore
                subscribe: (parent, args, context, info) => {
                    checkCapability(context.capabilities, Auth.RUNTIME_MESSAGES_SUBSCRIBE_CAPABILITY)
                    return pubsub.asyncIterator(PubSub.DIRECT_MESSAGE_RECEIVED)
                },
                //@ts-ignore
                resolve: payload => payload
            },
            perspectiveAdded: {
                //@ts-ignore
                subscribe: (parent, args, context, info) => {
                    checkCapability(context.capabilities, Auth.PERSPECTIVE_SUBSCRIBE_CAPABILITY)
                    return pubsub.asyncIterator(PubSub.PERSPECTIVE_ADDED_TOPIC)
                },
                //@ts-ignore
                resolve: payload => payload?.perspective
            },
            perspectiveLinkAdded: {
                //@ts-ignore
                subscribe: (parent, args, context, info) => {
                    checkCapability(context.capabilities, Auth.PERSPECTIVE_SUBSCRIBE_CAPABILITY)
                    return withFilter(
                        () => pubsub.asyncIterator(PubSub.LINK_ADDED_TOPIC),
                        (payload, argsInner) => payload.perspective.uuid === argsInner.uuid
                    )(undefined, args)
                },
                //@ts-ignore
                resolve: payload => payload?.link
            },
            perspectiveLinkRemoved: {
                //@ts-ignore
                subscribe: (parent, args, context, info) => {
                    checkCapability(context.capabilities, Auth.PERSPECTIVE_SUBSCRIBE_CAPABILITY)
                    return withFilter(
                        () => pubsub.asyncIterator(PubSub.LINK_REMOVED_TOPIC),
                        (payload, variables) => payload.perspective.uuid === variables.uuid
                    )(undefined, args)
                },
                //@ts-ignore
                resolve: payload => payload?.link
            },
            perspectiveUpdated: {
                //@ts-ignore
                subscribe: (parent, args, context, info) => {
                    checkCapability(context.capabilities, Auth.PERSPECTIVE_SUBSCRIBE_CAPABILITY)
                    return pubsub.asyncIterator(PubSub.PERSPECTIVE_UPDATED_TOPIC)
                },
                //@ts-ignore
                resolve: payload => payload?.perspective
            },
            perspectiveRemoved: {
                //@ts-ignore
                subscribe: (parent, args, context, info) => {
                    checkCapability(context.capabilities, Auth.PERSPECTIVE_SUBSCRIBE_CAPABILITY)
                    return pubsub.asyncIterator(PubSub.PERSPECTIVE_REMOVED_TOPIC)
                },
                //@ts-ignore
                resolve: payload => payload?.uuid
            },
            exceptionOccurred: {
                //@ts-ignore
                subscribe: (parent, args, context, info) => {
                    checkCapability(context.capabilities, Auth.RUNTIME_EXCEPTION_SUBSCRIBE_CAPABILITY)
                    return pubsub.asyncIterator(PubSub.EXCEPTION_OCCURRED_TOPIC)
                },
                //@ts-ignore
                resolve: payload => payload
            }
        },

        ExpressionRendered: {
            //@ts-ignore
            language: async (expression) => {
                //console.log("GQL LANGUAGE", expression)
                const lang = await core.languageController.languageForExpression(expression.ref) as any
                lang.address = expression.ref.language.address
                return lang
            },

            //@ts-ignore
            icon: (expression) => {
                return { code: core.languageController.getIcon(expression.ref.language) }
            }
        },

        LanguageHandle: {
            // @ts-ignore
            constructorIcon: async (language) => {
                if (language.expressionUI) {
                    const code = language.expressionUI.constructorIcon();

                    if (code) {
                        return { code }
                    } else {
                        return { code: "" }
                    }
                }

                return null
            },
            //@ts-ignore
            icon: async (language) => {
                if (language.expressionUI) {
                    const code = language.expressionUI.icon();

                    if (code) {
                        return { code }
                    } else {
                        return { code: "" }
                    }
                }

                return null
            },
            //@ts-ignore
            settings: async (language) => {
                return JSON.stringify(core.languageController.getSettings(language.address))
            },
            //@ts-ignore
            settingsIcon: async (language) => {
                if (language.settingsUI) {
                    const code = language.settingsUI.settingsIcon();

                    if (code) {
                        return { code }
                    } else {
                        return { code: "" }
                    }
                }

                return null  
            }
        },

        Agent: {
            //@ts-ignore
            directMessageLanguage: async (agent) => {
                //console.debug("GQL| AGENT.directMessageLanguage:", agent)
                if(agent.directMessageLanguage && agent.directMessageLanguage !== "")
                    return agent.directMessageLanguage
                else {
                    const exprAdapter = core.languageController.getAgentLanguage().expressionAdapter;
                    if (!exprAdapter) {
                        throw Error("Agent language does not have an expression adapter")
                    }
                    const agentExpression = await exprAdapter.get(agent.did)
                    if(agentExpression)
                        return (agentExpression.data as Agent).directMessageLanguage
                    else
                        return null
                }
            },
            //@ts-ignore
            perspective: async (agent) => {
                //console.debug("GQL| AGENT.perspective:", agent)
                if(agent.perspective && agent.perspective !== "")
                    return agent.perspective
                else {
                    const exprAdapter = core.languageController.getAgentLanguage().expressionAdapter;
                    if (!exprAdapter) {
                        throw Error("Agent language does not have an expression adapter")
                    }
                    const agentExpression = await exprAdapter.get(agent.did)
                    if(agentExpression)
                        return (agentExpression.data as Agent).perspective
                    else
                        return null
                }
            }
        },

        DateTime: new GraphQLScalarType({
            name: 'Date',
            description: 'Date custom scalar type',
            parseValue(value) {
              return new Date(value); // value from the client
            },
            serialize(value) {
              return value.toISOString(); // value sent to the client
            }
        }),
    }
}

export interface StartServerParams {
    core: PerspectivismCore, 
    mocks: boolean,
    port: number,
}

export async function startServer(params: StartServerParams) {
    const { core, mocks, port } = params
    const resolvers = createResolvers(core)
    const typeDefs = gql(typeDefsString)
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        mocks,
        context: async (req) => {
            // Get the user token from the headers.
            const authToken = req.connection?.context.headers.authorization || ''
            const capabilities = await core.agentService.getCapabilities(authToken)
            if(!capabilities) throw new AuthenticationError("User capability is empty.")
            
            return { capabilities };
          },
    });
    const { url, subscriptionsUrl } = await server.listen({ port })
    return { url, subscriptionsUrl }
}
