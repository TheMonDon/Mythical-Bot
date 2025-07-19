const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class AddMember extends Command {
  constructor(client) {
    super(client, {
      name: 'add-member',
      description: 'Add a user to a ticket.',
      usage: 'add-member <Member>',
      category: 'Tickets',
      aliases: ['addmember', 'add'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!(await db.get(`servers.${msg.guild.id}.tickets`)))
      return msg.channel.send('The ticket system has not been setup in this server.');

    if (!msg.channel.name.startsWith('ticket'))
      return msg.channel.send('You need to be inside the ticket you want to add a member to.');

    const mem = await this.client.util.getMember(msg, args.join(' '));
    if (!mem) return msg.channel.send('That is not a valid user.');

    const { roleID } = await db.get(`servers.${msg.guild.id}.tickets`);
    const role = msg.guild.roles.cache.get(roleID);
    const owner = await db.get(`servers.${msg.guild.id}.tickets.${msg.channel.id}.owner`);

    // Do they have the support role or are owner?
    if (owner !== msg.author.id) {
      if (!msg.member.roles.cache.some((r) => r.id === roleID)) {
        return msg.channel.send(`You need to be the ticket owner or a member of ${role.name} to add a user.`);
      }
    }
    msg.guild.members.fetch(mem.id);

    if (msg.channel.members.get(mem.id) !== undefined)
      return msg.channel.send('That person has already been added to this ticket.');

    await msg.channel.permissionOverwrites.edit(mem.id, { ViewChannel: true });

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setTitle('Member Added')
      .setColor('#E65DF4')
      .setDescription(`${msg.author} has added a member: \n${mem} (${mem.displayName})`);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = AddMember;
