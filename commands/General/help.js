const Command = require('../../base/Command.js');
const { toProperCase } = require('../../util/Util.js');
const { EmbedBuilder } = require('discord.js');
const db = require('quick.db');

class Help extends Command {
  constructor (client) {
    super(client, {
      name: 'help',
      description: 'Displays all the available commands for you.',
      category: 'General',
      usage: 'Help <Category || Command>',
      aliases: ['h']
    });
  }

  async run (msg, args, level) {
    const cats = ['Administrator', 'Economy', 'Fun', 'Games', 'General', 'Giveaways', 'Information', 'Logging', 'Memes', 'Minecraft', 'Moderator', 'Music', 'NSFW', 'Search', 'Tickets'];
    const allcats = ['Bot Admin', 'Administrator', 'Crafters Island', 'Economy', 'Fun', 'Games', 'General', 'Giveaways', 'Information', 'Logging', 'Memes', 'Minecraft', 'Moderator', 'Music', 'NSFW', 'Owner', 'Search', 'Tickets'];

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() });

    const errEm = new EmbedBuilder()
      .setColor('#FFA500')
      .setDescription(`Please select a category to see all available commands. \nUsage: \`${msg.settings.prefix}help <category>\` \nUsage: \`${msg.settings.prefix}help <command>\``)
      .addFields([
        { name: 'Current Categories:', value: level >= 8 ? allcats.join(', ') : cats.join(', ') },
        { name: 'Quick Bits', value: '[Invite Link](https://cisn.xyz/mythical) \n[Source Code]((https://github.com/TheMonDon/Mythical-Bot))' }
      ]);

    if (!args || args.length < 1) return msg.channel.send({ embeds: [errEm] });

    const category = toProperCase(args.join(' '));
    const disabled = db.get(`servers.${msg.guild.id}.disabled`) || [];
    em.setTitle(`${category} Commands`)
      .setColor('#0099CC');
    const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
    const myC = [...myCommands.values()];
    const sorted = myC.sort((p, c) => p.help.category > c.help.category ? 1 : p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1);
    sorted.forEach(c => {
      const cat = toProperCase(c.help.category);
      if (category === cat) em.addFields([{ name: `${msg.settings.prefix}${toProperCase(c.help.name)}`, value: `${c.help.description}` }]);
    });
    if (!em.data?.fields || em.data?.fields?.length < 1) {
      let command = category.toLowerCase();
      command = this.client.commands.get(command) || this.client.commands.get(this.client.aliases.get(command));
      if (command) {
        if (level < this.client.levelCache[command.conf.permLevel]) return;
        const res = disabled.includes(command.help.category.toLowerCase()) || disabled.includes(command.help.name.toLowerCase());
        em
          .setTitle(`${toProperCase(command.help.name)} Information`)
          .setColor('#0099CC')
          .addFields([
            { name: 'Usage', value: command.help.usage },
            { name: 'Aliases', value: command.conf.aliases.join(', ') || 'none' },
            { name: 'Guild Only', value: command.conf.guildOnly.toString() || 'false' },
            { name: 'NSFW', value: command.conf.nsfw.toString() || 'false' },
            { name: 'Description', value: command.help.description || 'none' },
            { name: 'Long Description', value: command.help.longDescription || 'none' },
            { name: 'Command Disabled', value: toProperCase(res.toString()) }
          ]);
        return msg.channel.send({ embeds: [em] });
      } else {
        return msg.channel.send({ embeds: [errEm] });
      }
    } else if (em.data?.fields?.length > 0) {
      em.addFields([{ name: 'Category Disabled', value: toProperCase(disabled.includes(category.toLowerCase()).toString()) }]);
      return msg.channel.send({ embeds: [em] });
    }
    return msg.channel.send({ embeds: [errEm] });
  }
}

module.exports = Help;
