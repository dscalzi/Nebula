import { ForgeModStructure113 } from '../structure/spec_model/module/forgemod/ForgeMod113.struct'
import { ForgeModStructure17 } from '../structure/spec_model/module/forgemod/ForgeMod17.struct'
import { ForgeGradle3Adapter } from '../resolver/forge/adapter/ForgeGradle3.resolver'
import { ForgeGradle2Adapter } from '../resolver/forge/adapter/ForgeGradle2.resolver'
import { ForgeResolver } from '../resolver/forge/forge.resolver'
import { BaseForgeModStructure } from '../structure/spec_model/module/ForgeMod.struct'
import { MinecraftVersion } from './MinecraftVersion'
import { UntrackedFilesOption } from '../model/nebula/servermeta'

export class VersionSegmentedRegistry {

    public static readonly FORGE_ADAPTER_IMPL = [
        ForgeGradle2Adapter,
        ForgeGradle3Adapter
    ]

    public static readonly FORGEMOD_STRUCT_IML = [
        ForgeModStructure17,
        ForgeModStructure113
    ]

    public static getForgeResolver(
        minecraftVersion: MinecraftVersion,
        forgeVersion: string,
        absoluteRoot: string,
        relativeRoot: string,
        baseURL: string,
        discardOutput: boolean,
        invalidateCache: boolean
    ): ForgeResolver {
        for (const impl of VersionSegmentedRegistry.FORGE_ADAPTER_IMPL) {
            if (impl.isForVersion(minecraftVersion, forgeVersion)) {
                return new impl(absoluteRoot, relativeRoot, baseURL, minecraftVersion, forgeVersion, discardOutput, invalidateCache)
            }
        }
        throw new Error(`No forge resolver found for Minecraft ${minecraftVersion}!`)
    }

    public static getForgeModStruct(
        minecraftVersion: MinecraftVersion,
        forgeVersion: string,
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        untrackedFiles: UntrackedFilesOption[]
    ): BaseForgeModStructure {
        for (const impl of VersionSegmentedRegistry.FORGEMOD_STRUCT_IML) {
            if (impl.isForVersion(minecraftVersion, forgeVersion)) {
                return new impl(absoluteRoot, relativeRoot, baseUrl, minecraftVersion, untrackedFiles)
            }
        }
        throw new Error(`No forge mod structure found for Minecraft ${minecraftVersion}!`)
    }

}
