import { join } from 'path'
import { JarExecutor } from './JarExecutor'

export class PackXZExtractWrapper extends JarExecutor<void> {

    constructor() {
        super('PackXZExtract')
    }

    protected getJarPath(): string {
        return join(process.cwd(), 'libraries', 'java', 'PackXZExtract.jar')
    }

    protected execute(command: string, paths: string[]): Promise<void> {
        return super.executeJar([], command, paths.join(','))
    }

    public extractUnpack(paths: string[]): Promise<void> {
        return this.execute('-packxz', paths)
    }

    public extract(paths: string[]): Promise<void> {
        return this.execute('-xz', paths)
    }

    public unpack(paths: string[]): Promise<void> {
        return this.execute('-pack', paths)
    }

}
