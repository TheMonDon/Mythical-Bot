const Command = require('../../base/Command.js');
const mcUtil = require('minecraft-server-util');
const { EmbedBuilder } = require('discord.js');

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
      .catch(() => {});
    const creative = await mcUtil.status('192.168.2.29', { port: 25562 })
      .catch(() => {});
    const survival = await mcUtil.status('192.168.2.29', { port: 25567 })
      .catch(() => {});
    const rcc = await mcUtil.status('192.168.2.29', { port: 25569 })
      .catch(() => {});

    const em = new EmbedBuilder()
      .setColor('0099CC')
      .setTitle('Status Checker')
      .addFields([
        { name: 'Total', value: bungee ? `Players: ${bungee.onlinePlayers + '/' + bungee.maxPlayers}` : 'Offline' },
        { name: 'Survival', value: survival ? `Players: ${survival.onlinePlayers + '/' + survival.maxPlayers}` : 'Offline' },
        { name: 'Creative', value: creative ? `Players: ${creative.onlinePlayers + '/' + creative.maxPlayers}` : 'Offline' },
        { name: 'RCC', value: rcc ? `Players: ${rcc.onlinePlayers + '/' + rcc.maxPlayers}` : 'Offline' }
      ]);
    return msg.channel.send({ embeds: [em] });
  }
};
