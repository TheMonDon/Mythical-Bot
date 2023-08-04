const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class RemoveMember extends Command {
  constructor(client) {
    super(client, {
      name: 'remove-member',
      description: 'Remove a member from a ticket.',
      usage: 'remove-member <Member>',
      category: 'Tickets',
      aliases: ['removemember', 'remove'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!(await db.get(`servers.${msg.guild.id}.tickets`)))
      return msg.channel.send('The ticket system has not been setup in this server.');

    if (!msg.channel.name.startsWith('ticket'))
      return msg.channel.send('You need to be inside the ticket you want to remove a member from.');

    const mem = await this.client.util.getMember(msg, args.join(' '));
    if (!mem) return msg.channel.send('That is not a valid member.');
    if (mem.id === msg.author.id)
      return msg.channel.send(`Are you trying to close your ticket? Use \`${msg.settings.prefix}close\` instead`);

    const { roleID } = await db.get(`servers.${msg.guild.id}.tickets`);
    const role = msg.guild.roles.cache.get(roleID);
    const owner = await db.get(`servers.${msg.guild.id}.tickets.${msg.channel.id}.owner`);

    // Do they have the support role or are owner?
    if (owner !== msg.author.id) {
      if (!msg.member.roles.cache.some((r) => r.id === roleID)) {
        return msg.channel.send(`You need to be the ticket owner or a member of ${role.name} to remove a user.`);
      }
    }

    if (!msg.channel.members.get(mem.id)) return msg.channel.send('That person has not been added to this ticket.');

    msg.channel.permissionOverwrites.edit(mem.id, { ViewChannel: null });

    const em = new EmbedBuilder()
      .setTitle('Member Removed')
      .setColor('#E65DF4')
      .setDescription(`${msg.author} has removed a member: \n${mem} (${mem.displayName})`);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = RemoveMember;
