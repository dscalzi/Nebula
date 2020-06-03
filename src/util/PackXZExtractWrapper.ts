import { spawn } from 'child_process'
import { join } from 'path'
import { JavaUtil } from './javautil'
import { LoggerUtil } from './LoggerUtil'

export class PackXZExtractWrapper {

    private static readonly logger = LoggerUtil.getLogger('PackXZExtract')

    public static getPackXZExtract(): string {
        return join(process.cwd(), 'libraries', 'java', 'PackXZExtract.jar')
    }

    public static extractUnpack(paths: string[]): Promise<void> {
        return PackXZExtractWrapper.execute('-packxz', paths)
    }

    public static extract(paths: string[]): Promise<void> {
        return PackXZExtractWrapper.execute('-xz', paths)
    }

    public static unpack(paths: string[]): Promise<void> {
        return PackXZExtractWrapper.execute('-pack', paths)
    }

    private static execute(command: string, paths: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const child = spawn(JavaUtil.getJavaExecutable(), [
                '-jar',
                PackXZExtractWrapper.getPackXZExtract(),
                command,
                paths.join(',')
            ])
            child.stdout.on('data', (data) => PackXZExtractWrapper.logger.info(data.toString('utf8').trim()))
            child.stderr.on('data', (data) => PackXZExtractWrapper.logger.error(data.toString('utf8').trim()))
            child.on('close', code => {
                PackXZExtractWrapper.logger.info('Exited with code', code)
                resolve()
            })
            child.on('error', (err) => {
                PackXZExtractWrapper.logger.info('Error during process execution', err)
                reject(err)
            })
        })
    }

}
