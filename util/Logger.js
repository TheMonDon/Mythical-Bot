const chalk = require('chalk');
const moment = require('moment');
const { botLogsWebhookURL } = require('../config.js');
const { WebhookClient, EmbedBuilder } = require('discord.js');

function log(content, type = 'log') {
  const timestamp = `[${moment().format('YYYY-MM-DD HH:mm:ss')}]:`;
  let logs;
  if (botLogsWebhookURL) logs = new WebhookClient({ url: botLogsWebhookURL });
  const embed = new EmbedBuilder().setDescription(content.toString().substring(0, 4096)).setTimestamp();
  switch (type) {
    case 'log': {
      embed.setTitle('Logging').setColor('#0099CC');
      logs?.send({ embeds: [embed] });
      return console.log(`${timestamp} ${chalk.bgBlue(type.toUpperCase())} ${content}`);
    }
    case 'warn': {
      embed.setTitle('Warning').setColor('#FFA500');
      logs?.send({ embeds: [embed] });
      return console.log(`${timestamp} ${chalk.black.bgYellow(type.toUpperCase())} ${content}`);
    }
    case 'error': {
      embed.setTitle('Error').setColor('#FF0000');
      logs?.send({ embeds: [embed] });
      return console.log(`${timestamp} ${chalk.bgRed(type.toUpperCase())} ${content}`);
    }
    case 'debug': {
      return console.log(`${timestamp} ${chalk.green(type.toUpperCase())} ${content}`);
    }
    case 'ready': {
      embed.setTitle('Ready').setColor('#00FF00');
      logs?.send({ embeds: [embed] });
      return console.log(`${timestamp} ${chalk.black.bgGreen(type.toUpperCase())} ${content}`);
    }
    default:
      throw new TypeError('Logger type must be either warn, debug, log, ready or error.');
  }
}

function error(content) {
  return this.log(content, 'error');
}

function warn(content) {
  return this.log(content, 'warn');
}

function debug(content) {
  return this.log(content, 'debug');
}

function ready(content) {
  return this.log(content, 'ready');
}

module.exports = { log, error, warn, debug, ready };
