export interface VersionManifestFG2 {

    id: string
    time: string
    releaseTime: string
    type: string
    minecraftArguments: string
    mainClass: string
    inheritsFrom: string
    jar: string
    logging: Record<string, unknown>
    libraries: {
        name: string
        url?: string
        checksums?: string[]
        serverreq?: boolean
        clientreq?: boolean
        comment?: string
    }[]

}
