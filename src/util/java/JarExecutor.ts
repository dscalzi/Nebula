import { JavaUtil } from './javautil'
import { Logger } from 'winston'
import { spawn } from 'child_process'
import { LoggerUtil } from '../LoggerUtil'

export abstract class JarExecutor<T> {

    protected readonly logger: Logger

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected stdoutListeners: ((chunk: any) => void)[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected stderrListeners: ((chunk: any) => void)[] = []
    protected onCloseListeners: ((code: number | null) => Promise<void>)[] = []

    protected lastExecutionResult!: T

    protected constructor(loggerName: string) {
        this.logger = LoggerUtil.getLogger(loggerName)
    }

    protected abstract getJarPath(): string

    protected executeJar(vmOptions: string[], ...args: string[]): Promise<T> {
        this.lastExecutionResult = undefined!
        return new Promise((resolve, reject) => {
            const child = spawn(JavaUtil.getJavaExecutable(), [
                ...vmOptions,
                '-jar',
                this.getJarPath(),
                ...args
            ])
            child.stdout.on('data', (data) => this.logger.info(data.toString('utf8').trim()))
            this.stdoutListeners.forEach(l => child.stdout.on('data', l))

            child.stderr.on('data', (data) => this.logger.error(data.toString('utf8').trim()))
            this.stderrListeners.forEach(l => child.stderr.on('data', l))

            child.on('close', async code => {
                this.logger.info('Exited with code', code)
                for(const l of this.onCloseListeners) {
                    await l(code)
                }
                resolve(this.lastExecutionResult)
            })

            child.on('error', (err) => {
                this.logger.info('Error during process execution', err)
                reject(err)
            })
        })
    }

}