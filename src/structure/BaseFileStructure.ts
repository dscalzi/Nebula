import { mkdirs } from 'fs-extra'
import { join, resolve } from 'path'
import { FileStructure } from './FileStructure'
import { Logger } from 'winston'
import { LoggerUtil } from '../util/LoggerUtil'

export abstract class BaseFileStructure implements FileStructure {

    protected logger: Logger
    protected containerDirectory: string

    constructor(
        protected absoluteRoot: string,
        protected relativeRoot: string,
        protected structRoot: string
    ) {
        this.relativeRoot = join(relativeRoot, structRoot)
        this.containerDirectory = resolve(absoluteRoot, structRoot)
        this.logger = LoggerUtil.getLogger(this.getLoggerName())
    }

    public async init(): Promise<void> {
        mkdirs(this.containerDirectory)
    }

    public abstract getLoggerName(): string

}
