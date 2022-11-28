import { colors } from '@src/utils'
import { getPluginNameByPath } from './getPluginNameByPath'
import { PluginLogger } from '@/logger'
import { KiviPluginError } from './pluginError'
import { plugins } from '@/start'

import type { Client } from 'oicq'
import type { KiviConf } from '@/config'
import type { KiviPlugin } from './plugin'

/** 通过插件模块路径启用单个插件 */
export async function enablePlugin(bot: Client, kiviConf: KiviConf, pluginPath: string) {
  const error = (msg: any, ...args: any[]) => {
    bot.logger.error(msg, ...args)
    PluginLogger.error(msg, ...args)
  }

  const info = (msg: any, ...args: any[]) => {
    bot.logger.info(msg, ...args)
    PluginLogger.info(msg, ...args)
  }

  PluginLogger.debug('enablePlugin: ' + pluginPath)

  const pluginName = getPluginNameByPath(pluginPath)

  try {
    PluginLogger.debug('pluginPath: ' + pluginPath)
    const plugin = (await require(pluginPath)) as KiviPlugin

    if (plugin?.mountKiviBotClient) {
      try {
        await plugin.mountKiviBotClient(bot, [...kiviConf.admins])

        plugins.set(pluginName, plugin)

        info(`[${pluginName}] is now on`)

        return true
      } catch (e) {
        if (e instanceof KiviPluginError) {
          e.log()
        } else {
          error(`error occurred during mount: ${e}`)
        }
      }
    } else {
      error(colors.red(`[${pluginName}] dosen't have default export of \`KiviPlugin\` instance`))
    }
  } catch (e) {
    if (e instanceof KiviPluginError) {
      e.log()
    } else {
      error(`error occurred during require: ${e}`)
    }
  }

  plugins.delete(pluginName)

  return false
}
