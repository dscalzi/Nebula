export class MinecraftVersion {

    private static readonly MINECRAFT_VERSION_REGEX = /(\d+).(\d+).(\d+)/

    private readonly major: number
    private readonly minor: number
    private readonly revision: number

    constructor(version: string) {
        const res = MinecraftVersion.MINECRAFT_VERSION_REGEX.exec(version)
        if(res != null) {
            this.major = Number(res[1])
            this.minor = Number(res[2])
            this.revision = Number(res[3])
        } else {
            throw new Error(`${version} is not a valid minecraft version!`)
        }
    }

    public static isMinecraftVersion(version: string): boolean {
        return MinecraftVersion.MINECRAFT_VERSION_REGEX.test(version)
    }

    public getMajor(): number { return this.major }
    public getMinor(): number { return this.minor }
    public getRevision(): number { return this.revision }

    public toString(): string { return `${this.major}.${this.minor}.${this.revision}`}

}