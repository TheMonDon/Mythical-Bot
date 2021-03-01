const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class Add extends Command {
  constructor (client) {
    super(client, {
      name: 'add',
      description: 'Adds a member to a ticket.',
      usage: 'add <user>',
      category: 'Tickets',
      guildOnly: true
    });
  }

  async run (msg, args) {
    if (!db.get(`servers.${msg.guild.id}.tickets`)) return msg.channel.send('The ticket system has not been setup in this server.');

    if (!msg.channel.name.startsWith('ticket')) return msg.channel.send('You need to be inside the ticket you want to add a user to.');

    if (!args[0]) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}add <user>`);

    const server = msg.guild;
    const mem = msg.mentions.members.first() || server.members.cache.find(m => m.id === `${args.join(' ')}`) || server.members.cache.find(m => m.displayName.toUpperCase() === `${args.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toUpperCase() === `${args.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toLowerCase()
      .includes(`${args.join(' ').toLowerCase()}`));
    if (!mem) return msg.channel.send('That is not a valid user.');

    const { roleID } = db.get(`servers.${msg.guild.id}.tickets`);
    const role = msg.guild.roles.cache.get(roleID);
    const tName = msg.channel.name;
    const owner = db.get(`servers.${msg.guild.id}.tickets.${tName}.owner`);

    // Do they have the support role or are owner?
    if (owner !== msg.author.id) {
      if (!msg.member.roles.cache.some(r => r.id === roleID)) {
        return msg.channel.send(`You need to be the ticket owner or a member of ${role.name} to add a user.`);
      }
    }

    if (msg.channel.permissionOverwrites.get(mem.id) !== undefined) return msg.channel.send('That person has already been added to this ticket.');

    msg.channel.updateOverwrite(mem.id, { VIEW_CHANNEL: true });

    // Logging info
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const timestamp = month + '/' + day + '/' + year + ' ' + hour + ':' + min;

    const output = `${timestamp} - ${msg.author.tag} has added another member: \n${mem.displayName}.`;

    db.push(`servers.${msg.guild.id}.tickets.${tName}.chatLogs`, output);

    const em = new DiscordJS.MessageEmbed()
      .setTitle('Member Added')
      .setColor('#E65DF4')
      .setDescription(`${msg.author} has added another member: \n${mem} (${mem.displayName})`);
    return msg.channel.send(em);
  }
}

module.exports = Add;
