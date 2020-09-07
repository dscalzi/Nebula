export interface ClaritasModuleMetadata {
    
    /**
     * Present on ForgeMods (1.7-1.12) of type MOD.
     * Possibly present on ForgeMods (1.7-1.12) of type CORE_MOD and TWEAKER.
     * Always present on ForgeMods 1.13+.
     * Never present in all other circumstances.
     */
    id?: string
    /**
     * Never present on ForgeMods (1.7-1.12) of type UNKNOWN.
     * Present in all other circumstances.
     */
    group?: string
    /**
     * Possibly present on ForgeMods (1.7-1.12).
     * Never present in all other circumstances.
     */
    version?: string
    /**
     * Possibly present on ForgeMods (1.7-1.12).
     * Never present in all other circumstances.
     */
    name?: string
    /**
     * Always present on ForgeMods (1.7-1.12).
     * Never present in all other circumstances.
     */
    modType?: ForgeModType_1_7

}

export enum ForgeModType_1_7 {
    MOD = 'MOD',
    CORE_MOD = 'CORE_MOD',
    TWEAKER = 'TWEAKER',
    UNKNOWN = 'UNKNOWN'
}

export interface ClaritasResult {

    [jarPath: string]: ClaritasModuleMetadata | undefined

}