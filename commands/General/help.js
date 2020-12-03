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

    const cats = ['General', 'Economy', 'Fun', 'Memes', 'NSFW', 'Logging', 'Information', 'Music', 'Moderator', 'Administrator'];
    const allcats = ['General', 'Economy', 'Fun', 'Memes', 'NSFW', 'Logging', 'Information', 'Music', 'Moderator', 'Administrator', 'Ticket', 'Owner'];
    const text = args.join(' ').toLowerCase();
    const em = new MessageEmbed();
    const name = msg.member && msg.member.displayName || msg.author.username;
    em.setAuthor(name, msg.author.displayAvatarURL());

    if (!text) {
      em.setColor('ORANGE');
      em.setDescription(`Please select a category to see all available commands. \nUsage: \`${msg.settings.prefix}help <category\` \nUsage: \`${msg.settings.prefix}help <command>\``);
      em.addField('Current Categories:', cats, true);
      em.addField('Quick Bits', '[Invite Link](https://discord.com/oauth2/authorize?client_id=742407958729588767&scope=bot&permissions=171306176)', true);
      return msg.channel.send(em);
    }
    // All Categories hidden thingy.
    if (['allcats', 'cats', 'all'].includes(text)) {
      em.setTitle('Hidden Feature: All Categories');
      em.setColor('#0099CC');
      em.setAuthor(msg.member.displayName, msg.author.displayAvatarURL());
      em.addField('Current Categories', allcats, true);
      return msg.channel.send(em);
    } else if (['eco', 'economy', 'money'].includes(text)) {
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
    } else if (['nsfw'].includes(text)) {
      if (!msg.channel.nsfw) return msg.channel.send('You need to be in a NSFW channel to view these commands.');
      const category = 'NSFW';
      em.setTitle(`${category} Commands`);
      em.setColor('0099CC');
      const myCommands = this.client.commands.filter(cmd => this.client.levelCache[cmd.conf.permLevel] <= level);
      const sorted = myCommands.array().sort((p, c) => p.help.category > c.help.category ? 1 :  p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1 );
      sorted.forEach(c => {
        const cat = c.help.category.toUpperCase();
        if (category !== cat) {
          return;
        } else {
          em.addField(`${settings.prefix}${c.help.name.toProperCase()}`, `${c.help.description}`, false);
        }
      });
      return msg.channel.send(em);
    } else if (['mod', 'moderator', 'mods'].includes(text)) {
      if (!(msg.author.permLevel >= 2)) return msg.channel.send('This menu is locked to server mods only.');
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
      if (!(msg.author.permLevel >= 10)) return msg.channel.send('This menu is locked to owner only.');
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
    } else if (['bot admin', 'botadmin', 'ba'].includes(text)) {
      if (!(msg.author.permLevel >= 9)) return msg.channel.send('This menu is locked to bot admins only.');
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
    } else if (['admin', 'administrator', 'serveradmin', 'sa'].includes(text)) {
      if (!(msg.author.permLevel >= 3)) return msg.channel.send('This menu is locked to server admins only.');
      const category = 'Administrator';
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
        // return message.channel.send(`= ${command.help.name} = \n${command.help.description}\nusage:: ${command.help.usage}\nalises:: ${command.conf.aliases.join(', ')}`, {code:'asciidoc'});
      } else {
        em.setColor('ORANGE');
        em.setTitle('Incorrect Usage');
        em.setDescription(`Please select a category to see all available commands. \nUsage: \`${msg.settings.prefix}help <category\` \nUsage: \`${msg.settings.prefix}help <command>\``);
        em.addField('Current Categories:', cats, true);
        em.addField('Quick Bits', '[Invite Link](https://discord.com/oauth2/authorize?client_id=742407958729588767&scope=bot&permissions=171306176)', true);
        msg.channel.send(em);
      }
    }
  }
}

module.exports = Help;

