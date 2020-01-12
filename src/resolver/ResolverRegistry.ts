import { Forge113Adapter } from './forge/adapter/forge113.resolver'
import { Forge18Adapter } from './forge/adapter/forge18.resolver'
import { ForgeResolver } from './forge/forge.resolver'

export class ResolverRegistry {

    public static readonly FORGE_ADAPTER_IMPL = [
        Forge18Adapter,
        Forge113Adapter
    ]

    public static getForgeResolver(
        minecraftVersion: string,
        forgeVersion: string,
        absoluteRoot: string,
        relativeRoot: string,
        baseURL: string): ForgeResolver | undefined {
        for (const impl of ResolverRegistry.FORGE_ADAPTER_IMPL) {
            if (impl.isForVersion(minecraftVersion)) {
                return new impl(absoluteRoot, relativeRoot, baseURL, minecraftVersion, forgeVersion)
            }
        }
    }

}
