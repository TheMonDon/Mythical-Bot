const Command = require('../../base/Command.js');
const { MessageEmbed } = require('discord.js');

class Help extends Command {
  constructor (client) {
    super(client, {
      name: 'help',
      description: 'Displays all the available commands for you.',
      category: 'General',
      usage: 'help [command]',
      aliases: ['h']
    });
  }

  async run (msg, args, level) {
    const settings = msg.settings;

    const cats = ['Administrator', 'Economy', 'Fun', 'Games', 'General', 'Information', 'Logging', 'Memes', 'Minecraft', 'Moderator', 'Music', 'NSFW'];
    const allcats = ['Bot Admin', 'Administrator', 'Economy', 'Fun', 'Games', 'General', 'Information', 'Logging', 'Memes', 'Minecraft', 'Moderator', 'Music', 'NSFW', 'Owner', 'Tickets'];
    const text = args.join(' ').toProperCase();
    const em = new MessageEmbed()
      .setAuthor(msg.author.username, msg.author.displayAvatarURL());

    const errEm = new MessageEmbed()
      .setColor('ORANGE')
      .setDescription(`Please select a category to see all available commands. \nUsage: \`${msg.settings.prefix}help <category\` \nUsage: \`${msg.settings.prefix}help <command>\``)
      .addField('Current Categories:', level >= 8 ? allcats : cats, true)
      .addField('Quick Bits', '[Invite Link](https://discord.com/oauth2/authorize?client_id=742407958729588767&scope=bot&permissions=171306176)', true);

    if (!text) return msg.channel.send(errEm);

    const cat1 = args.join(' ').toProperCase();

    const category = cat1;
    em.setTitle(`${category} Commands`);
    em.setColor('0099CC');
    const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
    const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 : p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1);
    sorted.forEach(c => {
      const cat = c.help.category.toProperCase();
      if (category === cat) em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
    });
    if (em.fields < 1) {
      let command = cat1.toLowerCase();
      command = this.client.commands.get(command) || this.client.commands.get(this.client.aliases.get(command));
      if (command) {
        if (level < this.client.levelCache[command.conf.permLevel]) return;
        em.setTitle(`${command.help.name.toProperCase()} Information`);
        em.setColor('0099CC');
        em.addField('Usage', command.help.usage, false);
        em.addField('Aliases', command.conf.aliases.join(', ') || 'none', false);
        em.addField('Guild Only', command.conf.guildOnly, true);
        em.addField('NSFW', command.conf.nsfw, true);
        em.addField('Description', command.help.description, false);
        em.addField('Long Description', command.help.longDescription, false);
        return msg.channel.send(em);
      } else return msg.channel.send(errEm);
    }
    return msg.channel.send(em);
  }
}

module.exports = Help;
