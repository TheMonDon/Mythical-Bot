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

  async run (message, args, level) {
    const msg = message;

    const settings = msg.settings;

    const cats = ['General', 'Economy', 'Fun', 'Memes', 'Information', 'Music', 'Moderator'];
    const allcats = ['General', 'Economy', 'Fun', 'Memes', 'Information', 'Music', 'Moderator', 'Administrator', 'Ticket', 'Logging', 'Owner'];
    const text = args.join(' ').toLowerCase();

    if (!text) {
      const em = new MessageEmbed()
        .setColor('ORANGE')
        .setDescription(`Please select a category to see all available commands. \nUsage: \`${msg.settings.prefix}help <category\` \nUsage: \`${msg.settings.prefix}help <command>\``)
        .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
        .addField('Current Categories:', cats, true)
        .addField('Quick Bits', '[Invite Link](https://discord.com/oauth2/authorize?client_id=742407958729588767&scope=bot&permissions=171306176)', true);
      return msg.channel.send(em);
    }
    // All Categories hidden thingy.
    if (['allcats', 'cats', 'all'].includes(text)) {
      const embed = new MessageEmbed()
        .setTitle('Hidden Feature: All Categories')
        .setColor('#0099CC')
        .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
        .addField('Current Categories', allcats, true);
      return msg.channel.send(embed);
    } else if (['eco', 'economy', 'money'].includes(text)) {
      const em = new MessageEmbed();
      const category = 'Economy';
      em.setTitle(`${category} Commands`);
      em.setColor('0099CC');
      const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
      const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 :  p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1 );
      sorted.forEach(c => {
        const cat = c.help.category.toProperCase();
        if (category !== cat) {
          return;
        } else {
          em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
        }
      });
      return msg.channel.send(em);
    } else if (['info', 'information'].includes(text)) {
      const em = new MessageEmbed();
      const category = 'Information';
      em.setTitle(`${category} Commands`);
      em.setColor('0099CC');
      const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
      const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 :  p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1 );
      sorted.forEach(c => {
        const cat = c.help.category.toProperCase();
        if (category !== cat) {
          return;
        } else {
          em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
        }
      });
      return msg.channel.send(em);
    } else if (['meme', 'memes'].includes(text)) {
      const em = new MessageEmbed();
      const category = 'Memes';
      em.setTitle(`${category} Commands`);
      em.setColor('0099CC');
      const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
      const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 :  p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1 );
      sorted.forEach(c => {
        const cat = c.help.category.toProperCase();
        if (category !== cat) {
          return;
        } else {
          em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
        }
      });
      return msg.channel.send(em);
    } else if (['fun'].includes(text)) {
      const em = new MessageEmbed();
      const category = 'Fun';
      em.setTitle(`${category} Commands`);
      em.setColor('0099CC');
      const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
      const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 :  p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1 );
      sorted.forEach(c => {
        const cat = c.help.category.toProperCase();
        if (category !== cat) {
          return;
        } else {
          em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
        }
      });
      return msg.channel.send(em);
    } else if (['gen', 'general'].includes(text)) {
      const em = new MessageEmbed();
      const category = 'General';
      em.setTitle(`${category} Commands`);
      em.setColor('0099CC');
      const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
      const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 :  p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1 );
      sorted.forEach(c => {
        const cat = c.help.category.toProperCase();
        if (category !== cat) {
          return;
        } else {
          em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
        }
      });
      return msg.channel.send(em);
    } else if (['music'].includes(text)) {
      const em = new MessageEmbed();
      const category = 'Music';
      em.setTitle(`${category} Commands`);
      em.setColor('0099CC');
      const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
      const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 :  p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1 );
      sorted.forEach(c => {
        const cat = c.help.category.toProperCase();
        if (category !== cat) {
          return;
        } else {
          em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
        }
      });
      return msg.channel.send(em);
    } else if (['ticket', 'tickets', 'tix'].includes(text)) {
      const em = new MessageEmbed();
      const category = 'Tickets';
      em.setTitle(`${category} Commands`);
      em.setColor('0099CC');
      const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
      const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 :  p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1 );
      sorted.forEach(c => {
        const cat = c.help.category.toProperCase();
        if (category !== cat) {
          return;
        } else {
          em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
        }
      });
      return msg.channel.send(em);
    } else if (['log', 'logging', 'logs'].includes(text)) {
      const em = new MessageEmbed();
      const category = 'Logging';
      em.setTitle(`${category} Commands`);
      em.setColor('0099CC');
      const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
      const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 :  p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1 );
      sorted.forEach(c => {
        const cat = c.help.category.toProperCase();
        if (category !== cat) {
          return;
        } else {
          em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
        }
      });
      return msg.channel.send(em);
    } else if (['mod', 'moderator', 'mods'].includes(text)) {
      const em = new MessageEmbed();
      const category = 'Moderator';
      em.setTitle(`${category} Commands`);
      em.setColor('0099CC');
      const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
      const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 :  p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1 );
      sorted.forEach(c => {
        const cat = c.help.category.toProperCase();
        if (category !== cat) {
          return;
        } else {
          em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
        }
      });
      return msg.channel.send(em);
    } else if (['owner'].includes(text)) {
      const em = new MessageEmbed();
      const category = 'Owner';
      em.setTitle(`${category} Commands`);
      em.setColor('0099CC');
      const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
      const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 :  p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1 );
      sorted.forEach(c => {
        const cat = c.help.category.toProperCase();
        if (category !== cat) {
          return;
        } else {
          em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
        }
      });
      return msg.channel.send(em);
    } else if (['bot admin'].includes(text)) {
      const em = new MessageEmbed();
      const category = 'Bot Admin';
      em.setTitle(`${category} Commands`);
      em.setColor('0099CC');
      const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
      const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 :  p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1 );
      sorted.forEach(c => {
        const cat = c.help.category.toProperCase();
        if (category !== cat) {
          return;
        } else {
          em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
        }
      });
      return msg.channel.send(em);
    } else {
      let command = args[0];
      if (this.client.commands.has(command)) {
        command = this.client.commands.get(command);
        if (level < this.client.levelCache[command.conf.permLevel]) return;
        return message.channel.send(`= ${command.help.name} = \n${command.help.description}\nusage:: ${command.help.usage}\nalises:: ${command.conf.aliases.join(', ')}`, {code:'asciidoc'});
      } else {
        const em = new MessageEmbed()
          .setColor('ORANGE')
          .setTitle('Incorrect Usage')
          .setDescription(`Please select a category to see all available commands. \nUsage: \`${msg.settings.prefix}help <category\` \nUsage: \`${msg.settings.prefix}help <command>\``)
          .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
          .addField('Current Categories:', cats, true)
          .addField('Quick Bits', '[Invite Link](https://discord.com/oauth2/authorize?client_id=742407958729588767&scope=bot&permissions=171306176)', true);
        msg.channel.send(em);
      }
    }
  }
}

module.exports = Help;