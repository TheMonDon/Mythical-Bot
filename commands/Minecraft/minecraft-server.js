const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');

class MinecraftServer extends Command {
  constructor(client) {
    super(client, {
      name: 'minecraft-server',
      description: 'Get information about a Minecraft server',
      usage: 'minecraft-server <IP Address>',
      category: 'Minecraft',
      aliases: ['mcs', 'mcserver', 'mcstats', 'mc-server'],
    });
  }

  async run(msg, args) {
    let query = args.join(' ');
    if (!query) query = 'mc.hypixel.net';

    const servers = {
      'crafters-island': 'mc.crafters-island.com',
      hypixel: 'mc.hypixel.net',
      mineplex: 'us.mineplex.com',
      '2b2t': '2b2t.org',
      mcprison: 'mcprison.com',
      purpleprison: 'purpleprison.net',
    };

    query = servers[query.toString()] ? servers[query.toString()] : query;

    const { body } = await fetch.get(`https://api.mcsrvstat.us/2/${encodeURI(query)}`).catch(() => {
      return msg.channel.send('Sorry, either that is not a valid IP or that server is offline.');
    });

    if (!body.online) return msg.channel.send('Sorry, either that is not a valid IP or that server is offline.');

    const em = new EmbedBuilder()
      .setTitle('Minecraft Server Stats')
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .addFields([
        {
          name: 'IP Address:',
          value:
            `${body.hostname.toString() || body.ip.toString() + (body.port !== '25565' ? `:${body.port}` : '')}` ||
            'N/A',
          inline: false,
        },
        { name: 'Version:', value: body.version.toString() || 'N/A', inline: false },
        { name: 'Players:', value: `${body.players.online}/${body.players.max}` || 'N/A', inline: false },
        { name: 'MOTD:', value: body.motd.clean.toString() || 'N/A', inline: false },
      ]);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = MinecraftServer;
