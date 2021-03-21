const Command = require('../../base/Command.js');
const mcUtil = require('minecraft-server-util');
const { MessageEmbed } = require('discord.js');

module.exports = class status extends Command {
  constructor (client) {
    super(client, {
      name: 'status',
      description: 'Check the status of various Crafters-Island things.',
      usage: 'status',
      category: 'Crafters Island'
    });
  }

  async run (msg) {
    const bungee = await mcUtil.status('192.168.2.29')
      .catch(e => {});
    const hub = await mcUtil.status('192.168.2.29', { port: 25556 })
      .catch(e => {});
    const creative = await mcUtil.status('192.168.2.29', { port: 25562 })
      .catch(e => {});
    const prisons = await mcUtil.status('192.168.2.29', { port: 25563 })
      .catch(e => {});
    const survival = await mcUtil.status('192.168.2.29', { port: 25567 })
      .catch(e => {});
    const skyblock = await mcUtil.status('192.168.2.29', { port: 25568 })
      .catch(e => {});
    const rcc = await mcUtil.status('192.168.2.29', { port: 25569 })
      .catch(e => {});

    const em = new MessageEmbed()
      .setColor('0099CC')
      .setTitle('Status Checker')
      .addField('Total', bungee ? `Players: ${bungee.onlinePlayers + '/' + bungee.maxPlayers}` : 'Offline', true)
      .addField('Hub', hub ? `Players: ${hub.onlinePlayers + '/' + hub.maxPlayers}` : 'Offline', true)
      .addField('Survival', survival ? `Players: ${survival.onlinePlayers + '/' + survival.maxPlayers}` : 'Offline', true)
      .addField('Creative', creative ? `Players: ${creative.onlinePlayers + '/' + creative.maxPlayers}` : 'Offline', true)
      .addField('Prisons', prisons ? `Players: ${prisons.onlinePlayers + '/' + prisons.maxPlayers}` : 'Offline', true)
      .addField('Skyblock', skyblock ? `Players: ${skyblock.onlinePlayers + '/' + skyblock.maxPlayers}` : 'Offline', true)
      .addField('RCC', rcc ? `Players: ${rcc.onlinePlayers + '/' + rcc.maxPlayers}` : 'Offline', true);
    return msg.channel.send(em);
  }
};
