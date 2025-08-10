const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Starboard extends Command {
  constructor(client) {
    super(client, {
      name: 'starboard',
      description: 'Create/Delete starboard systems',
      category: 'Starboard',
      usage: 'starboard <create|delete> [name]',
      guildOnly: true,
      permLevel: 'Administrator',
      aliases: ['star', 'sb'],
      examples: ['starboard create highlights #starboard', 'starboard delete highlights'],
    });
  }

  async run(msg, args) {
    const starboards = (await db.get(`servers.${msg.guild.id}.starboards`)) || {};

    if (!args.length) {
      if (Object.keys(starboards).length === 0) {
        return msg.channel.send('No starboards have been set up yet!');
      }

      const errorEmbed = new EmbedBuilder()
        .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
        .setTitle('Invalid Subcommand')
        .setColor(msg.settings.embedErrorColor)
        .setDescription(
          `To view or edit a standards information please use /starboard. \nUsage: ${msg.settings.prefix}${this.help.usage}`,
        )
        .setTimestamp();

      return msg.channel.send({ embeds: [errorEmbed] });
    }

    const subCommand = args[0].toLowerCase();

    switch (subCommand) {
      case 'create': {
        if (Object.keys(starboards).length > 2) {
          return msg.channel.send(
            `This server has reached the maximum number of starboards available (3). Please use \`${msg.settings.prefix}starboard delete [name]\` to delete one before making a new one.`,
          );
        }

        if (args.length < 3) {
          return this.client.util.errorEmbed(msg, `${msg.settings.prefix}${this.help.usage}, 'Invalid Usage.'`);
        }

        const name = args[1];
        const channel = this.client.util.getChannel(msg, args[2]);

        const starKey = Object.keys(starboards).find((key) => key.toLowerCase() === name.toLowerCase());
        if (starboards[starKey]) {
          return this.client.util.errorEmbed(msg, `A starboard named \`${name}\` already exists.`);
        }

        if (!channel || !channel.permissionsFor(msg.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
          return this.client.util.errorEmbed(
            msg,
            'I need permission to view and send messages in that channel. Please re-run the command when this is fixed.',
          );
        }

        await db.set(`servers.${msg.guild.id}.starboards.${name}`, {
          enabled: true,
          channelId: channel.id,
          threshold: 3,
          color: msg.settings.embedColor,
          emoji: '⭐',
          'downvote-emoji': null,
          'allow-bots': true,
          'self-vote': false,
          'ping-author': false,
          'replied-to': true,
          'link-deletes': false,
          'link-edits': true,
          'autoreact-upvote': true,
          'autoreact-downvote': true,
          'remove-invalid-reactions': true,
          'require-image': false,
          'extra-embeds': true,
          'use-server-profile': true,
          'show-thumbnail': true,
          'older-than': null,
          'newer-than': null,
          'attachments-list': true,
          messages: {},
        });

        return msg.channel.send(`Created starboard \`${name}\` in ${channel}.`);
      }

      case 'delete': {
        if (!args[1]) {
          return this.client.util.errorEmbed(msg, 'Please specify a starboard name to delete.');
        }

        const name = args[1];

        const starKey = Object.keys(starboards).find((key) => key.toLowerCase() === name.toLowerCase());
        if (!starboards[starKey]) {
          return msg.channel.send(`No starboard named \`${name}\` exists.`);
        }

        await db.delete(`servers.${msg.guild.id}.starboards.${name}`);
        return msg.channel.send(`Deleted starboard \`${name}\`.`);
      }

      default:
        return msg.channel.send(
          `Invalid subcommand. Use \`${msg.settings.prefix}help starboard\` for more information.`,
        );
    }
  }
}

module.exports = Starboard;
