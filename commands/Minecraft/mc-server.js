const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');

class MinecraftServer extends Command {
  constructor (client) {
    super(client, {
      name: 'mc-server',
      description: 'Get information about a Minecraft server.',
      usage: 'mc-server <IP Address>',
      category: 'Minecraft',
      aliases: ['mcs', 'mcserver', 'mcstats', 'mcip']
    });
  }

  async run (msg, text) {
    let query = text.join(' ');
    if (!query) query = 'mc.crafters-island.com';

    const servers = {
      'crafters-island': 'mc.crafters-island.com',
      hypixel: 'mc.hypixel.net',
      skycade: 'play.skycade.net',
      mineplex: 'us.mineplex.com',
      '2b2t': '2b2t.org',
      mcprison: 'mcprison.com',
      purpleprison: 'purpleprison.net'
    };

    query = servers[query.toString()] ? servers[query.toString()] : query;

    const { body } = await fetch
      .get(`https://api.mcsrvstat.us/2/${encodeURI(query)}`)
      .catch(() => { return msg.channel.send('Sorry, either that is not a valid IP or that server is offline.'); });

    if (!body.online) return msg.channel.send('Sorry, either that is not a valid IP or that server is offline.');

    const em = new EmbedBuilder()
      .setTitle('Minecraft Server Stats')
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setColor('#2ecc71')
      .addFields([
        { name: 'IP Address:', value: `${body.hostname.toString() || body.ip.toString() + (body.port !== '25565' ? `:${body.port}` : '')}` || 'N/A', inLine: false },
        { name: 'Version:', value: body.version.toString() || 'N/A', inLine: false },
        { name: 'Players:', value: `${body.players.online}/${body.players.max}` || 'N/A', inLine: false },
        { name: 'MOTD:', value: body.motd.clean.toString() || 'N/A', inLine: false }
      ]);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = MinecraftServer;
