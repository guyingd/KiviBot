import path from 'node:path'
import { createClient } from 'oicq'
import crypto from 'node:crypto'
import fs, { ensureDirSync } from 'fs-extra'

import { colors, LOGO, exitWithError, notice } from '@src/utils'
import { ConfigPath, LogDir, OicqDataDir, PluginDataDir, PluginDir } from './path'
import { deviceHandler, errorHandler, qrCodeHandler, sliderHandler } from './login'
import { Devices, KiviLogger, redirectLog } from './logger'
import { kiviConf } from './config'
import { offlineHandler } from './logs'
import { onlineHandler } from './online'

import type { KiviPlugin } from './plugin'
import type { KiviConf } from './config'

export const plugins: Map<string, KiviPlugin> = new Map()

export const pkg = require(path.join(__dirname, '../../package.json'))

/** 启动框架 */
export const start = () => {
  // 设置终端标题
  process.title = `KiviBot ${pkg?.version ?? 'unknown'} `

  // 打印 KiviBot logo
  console.log(`\n${colors.cyan(LOGO)}\n`)

  if (!fs.existsSync(ConfigPath)) {
    exitWithError('config file `kivi.json` is not exist')
  }

  /** 捕获 Ctrl C 中断退出 */
  process.on('SIGINT', () => {
    notice.success(colors.yellow('exit KiviBot'), true)
    process.exit(0)
  })

  try {
    // 读取框架账号配置文件 `kivi.json`
    const conf: KiviConf = require(ConfigPath)

    // 载入配置到内存
    Object.assign(kiviConf, conf)

    // 终端标题加上账号
    process.title = `KiviBot ${pkg.version} ${kiviConf.account || 'unknown'}`

    console.log('welcome to KiviBot!\n')
    console.log('usage docs:\t' + colors.green('https://beta.kivibot.com'))
    console.log('frame version:\t' + colors.green(`@kivibot/core v${pkg.version}`))
    console.log('config file:\t' + colors.green(`${ConfigPath}\n`))

    const { log_level = 'info', oicq_config = {} } = kiviConf

    if (!kiviConf?.account) {
      exitWithError('invalid config file `kivi.json` ')
    }

    if (!kiviConf?.admins || kiviConf?.admins?.length <= 0) {
      exitWithError('the `admins` field in config file `kivi.json` needs at lease one admin')
    }

    // 缺省 oicq 配置

    // 未指定协议时，默认使用 iPad 协议作为 oicq 登录协议
    oicq_config.platform = oicq_config?.platform ?? 5
    // ociq 数据及缓存保存在 data/oicq 下
    oicq_config.data_dir = OicqDataDir
    // oicq 默认日志等级为 info
    oicq_config.log_level = oicq_config?.log_level ?? 'info'
    // 指定默认 ffmpeg 和 ffprobe 命令为全局路径
    oicq_config.ffmpeg_path = oicq_config?.ffmpeg_path ?? 'ffmpeg'
    oicq_config.ffprobe_path = oicq_config?.ffprobe_path ?? 'ffprobe'

    // 重定向日志，oicq 的日志输出到日志文件，KiviBot 的日志输出到 console
    redirectLog(log_level, oicq_config, kiviConf.account)

    // 确保 KiviBot 框架相关目录存在
    ensureDirSync(LogDir)
    ensureDirSync(PluginDir)
    ensureDirSync(PluginDataDir)

    const protocol = Devices[oicq_config.platform] || 'unknown'

    KiviLogger.info(colors.gray(`using ${protocol} protocol`))
    KiviLogger.info(colors.gray(`start logging ${kiviConf.account}`))
    KiviLogger.info(colors.gray(`looking for available server...`))

    // 初始化实例
    const bot = createClient(kiviConf.account, oicq_config)

    // 取消监听函数个数限制
    bot.setMaxListeners(Infinity)

    // 监听上线事件
    bot.on('system.online', onlineHandler.bind(bot, kiviConf))

    // 监听设备锁、滑块和登录错误的事件
    bot.on('system.login.device', deviceHandler.bind(bot, conf.device_mode))
    bot.on('system.login.slider', ({ url }) => sliderHandler.call(bot, { isFirst: true, url }))
    bot.on('system.login.error', errorHandler)

    // 监听下线事件
    bot.on('system.offline', offlineHandler)

    // 通过配置文件里指定的模式登录账号
    if (conf.login_mode === 'qrcode') {
      bot.on('system.login.qrcode', qrCodeHandler).login()
    } else {
      const plainPwd = Buffer.from(conf.password || '', 'base64').toString()
      const md5Pwd = crypto.createHash('md5').update(plainPwd).digest()
      bot.login(md5Pwd)
    }
  } catch (e) {
    KiviLogger.error(e)
    exitWithError('invalid config file `kivi.json`')
  }
}
