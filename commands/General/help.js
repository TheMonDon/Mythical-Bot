const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const db = require('quick.db');

class Help extends Command {
  constructor(client) {
    super(client, {
      name: 'help',
      description: 'Displays all the available commands for you.',
      category: 'General',
      usage: 'Help <Category || Command>',
      aliases: ['h'],
    });
  }

  async run(msg, args, level) {
    const cats = [
      'Administrator',
      'Economy',
      'Fun',
      'Games',
      'General',
      'Giveaways',
      'Information',
      'Logging',
      'Minecraft',
      'Moderator',
      'Music',
      'NSFW',
      'Search',
      'Tickets',
    ];
    const allcats = [
      'Bot Admin',
      'Administrator',
      'Economy',
      'Fun',
      'Games',
      'General',
      'Giveaways',
      'Information',
      'Logging',
      'Minecraft',
      'Moderator',
      'Music',
      'NSFW',
      'Owner',
      'Search',
      'Tickets',
    ];
    const color = msg.settings.embedColor;
    const msgArray = [];
    let type = 'command';

    const errEm = new EmbedBuilder()
      .setColor('#FFA500')
      .setDescription(
        `Please select a category to see all available commands. \nUsage: \`${msg.settings.prefix}help <category>\` \nUsage: \`${msg.settings.prefix}help <command>\``,
      )
      .addFields([
        { name: 'Current Categories:', value: level >= 8 ? allcats.join(', ') : cats.join(', ') },
        {
          name: 'Quick Bits',
          value: '[Invite Link](https://cisn.xyz/mythical) \n[Source Code](https://github.com/TheMonDon/Mythical-Bot) \n[Support Server](https://discord.com/invite/XvHzUNZDdR)',
        },
      ]);

    if (!args || args.length < 1) return msg.channel.send({ embeds: [errEm] });

    const category = this.client.util.toProperCase(args.join(' '));
    const disabled = db.get(`servers.${msg.guild.id}.disabled`) || [];

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setTitle(`${category} Commands`)
      .setColor(color);

    // Get the commands the user has access to
    const myCommands = this.client.commands.filter((cmd) => this.client.levelCache[cmd.conf.permLevel] <= level);
    const myC = [...myCommands.values()];
    const sorted = myC.sort((p, c) =>
      p.help.category > c.help.category ? 1 : p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1,
    );

    // Show all commands in the category
    sorted.forEach((c) => {
      const cat = this.client.util.toProperCase(c.help.category);
      if (category === cat) {
        msgArray.push(`${msg.settings.prefix}${this.client.util.toProperCase(c.help.name)}`);
        msgArray.push(`${c.help.description}`);
        type = 'category';
        em.addFields([
          {
            name: `${msg.settings.prefix}${this.client.util.toProperCase(c.help.name)}`,
            value: `${c.help.description}`,
            inline: true,
          },
        ]);
      }
    });

    if (type === 'category') {
      // Do stuff
    }

    // If no category is found, assume it's a command
    if (!em.data?.fields || em.data?.fields?.length < 1) {
      let command = category.toLowerCase();
      command = this.client.commands.get(command) || this.client.commands.get(this.client.aliases.get(command));

      if (command) {
        if (level < this.client.levelCache[command.conf.permLevel]) return;
        const res =
          disabled.includes(command.help.category.toLowerCase()) || disabled.includes(command.help.name.toLowerCase());
        em.setTitle(`${this.client.util.toProperCase(command.help.name)} Information`)
          .setColor(color)
          .addFields([
            { name: 'Usage', value: command.help.usage, inline: true },
            { name: 'Aliases', value: command.conf.aliases.join(', ') || 'None', inline: true },
            { name: 'Guild Only', value: command.conf.guildOnly.toString() || 'False', inline: true },
            { name: 'NSFW', value: command.conf.nsfw.toString() || 'False', inline: true },
            { name: 'Description', value: command.help.description || 'None', inline: true },
            { name: 'Long Description', value: command.help.longDescription || 'None', inline: true },
            { name: 'Command Disabled', value: res.toString(), inline: true },
            { name: 'Examples', value: command.help.examples?.join('\n') || 'None', inline: true}
          ]);
        return msg.channel.send({ embeds: [em] });
      }

      return msg.channel.send({ embeds: [errEm] });
    } else if (em.data?.fields?.length > 0) {
      // If category is found, show all commands in the category
      return msg.channel.send({ embeds: [em] });
    }
    return msg.channel.send({ embeds: [errEm] });
  }
}

module.exports = Help;
