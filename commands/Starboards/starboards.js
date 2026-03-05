const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

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
    const connection = await this.client.db.getConnection();

    try {
      const [starboards] = await connection.query(
        /* sql */ `
          SELECT
            *
          FROM
            starboards
          WHERE
            server_id = ?
        `,
        [msg.guild.id],
      );

      if (!args.length) {
        if (starboards.length === 0) {
          return msg.channel.send(
            `No starboards have been set up yet! \nUsage: ${msg.settings.prefix}${this.help.usage}`,
          );
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
          if (starboards.length > 2) {
            return msg.channel.send(
              `This server has reached the maximum number of starboards available (3). Please use \`${msg.settings.prefix}starboard delete [name]\` to delete one before making a new one.`,
            );
          }

          if (args.length < 3) {
            return this.client.util.errorEmbed(msg, `${msg.settings.prefix}${this.help.usage}, 'Invalid Usage.'`);
          }

          const name = args[1];
          const channel = this.client.util.getChannel(msg, args[2]);

          const existing = starboards.find((s) => s.name.toLowerCase() === name.toLowerCase());
          if (existing) {
            return this.client.util.errorEmbed(msg, `A starboard named \`${name}\` already exists.`);
          }

          if (!channel || !channel.permissionsFor(msg.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
            return this.client.util.errorEmbed(
              msg,
              'I need permission to view and send messages in that channel. Please re-run the command when this is fixed.',
            );
          }

          if (name.length > 255) {
            return this.client.util.errorEmbed(msg, 'The name for the starboard must be less than 255 characters.');
          }

          await connection.execute(
            /* sql */ `
              INSERT INTO
                starboards (
                  server_id,
                  name,
                  enabled,
                  channel_id,
                  threshold,
                  threshold_remove,
                  color,
                  emoji,
                  display_emoji,
                  downvote_emoji,
                  allow_bots,
                  self_vote,
                  ping_author,
                  replied_to,
                  link_deletes,
                  link_edits,
                  autoreact_upvote,
                  autoreact_downvote,
                  remove_invalid_reactions,
                  require_image,
                  extra_embeds,
                  use_server_profile,
                  show_thumbnail,
                  older_than,
                  newer_than,
                  attachments_list
                )
              VALUES
                (
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?
                ) ON DUPLICATE KEY
              UPDATE enabled =
              VALUES
                (enabled),
                channel_id =
              VALUES
                (channel_id),
                threshold =
              VALUES
                (threshold),
                threshold_remove =
              VALUES
                (threshold_remove),
                color =
              VALUES
                (color),
                emoji =
              VALUES
                (emoji),
                display_emoji =
              VALUES
                (display_emoji),
                downvote_emoji =
              VALUES
                (downvote_emoji),
                allow_bots =
              VALUES
                (allow_bots),
                self_vote =
              VALUES
                (self_vote),
                ping_author =
              VALUES
                (ping_author),
                replied_to =
              VALUES
                (replied_to),
                link_deletes =
              VALUES
                (link_deletes),
                link_edits =
              VALUES
                (link_edits),
                autoreact_upvote =
              VALUES
                (autoreact_upvote),
                autoreact_downvote =
              VALUES
                (autoreact_downvote),
                remove_invalid_reactions =
              VALUES
                (remove_invalid_reactions),
                require_image =
              VALUES
                (require_image),
                extra_embeds =
              VALUES
                (extra_embeds),
                use_server_profile =
              VALUES
                (use_server_profile),
                show_thumbnail =
              VALUES
                (show_thumbnail),
                older_than =
              VALUES
                (older_than),
                newer_than =
              VALUES
                (newer_than),
                attachments_list =
              VALUES
                (attachments_list)
            `,
            [
              msg.guild.id,
              name,
              true,
              channel.id,
              3, // threshold
              0, // threshold_remove
              msg.settings.embedColor, // color
              '⭐', // emoji
              '⭐', // display_emoji
              null, // downvote_emoji
              true, // allow_bots
              false, // self_vote
              false, // ping_author
              true, // replied_to
              false, // link_deletes
              true, // link_edits
              true, // autoreact_upvote
              true, // autoreact_downvote
              true, // remove_invalid_reactions
              false, // require_image
              true, // extra_embeds
              true, // use_server_profile
              true, // show_thumbnail
              null, // older_than
              null, // newer_than
              true, // attachments_list
            ],
          );

          return msg.channel.send(`Created starboard \`${name}\` in ${channel}.`);
        }

        case 'delete': {
          if (!args[1]) {
            return this.client.util.errorEmbed(msg, 'Please specify a starboard name to delete.');
          }

          const name = args[1];

          const existing = starboards.find((s) => s.name.toLowerCase() === name.toLowerCase());
          if (!existing) {
            return msg.channel.send(`No starboard named \`${name}\` exists.`);
          }

          await connection.execute(
            /* sql */ `
              DELETE FROM starboards
              WHERE
                id = ?
            `,
            [existing.id],
          );
          return msg.channel.send(`Deleted starboard \`${name}\`.`);
        }

        default:
          return msg.channel.send(
            `Invalid subcommand. Use \`${msg.settings.prefix}help starboard\` for more information.`,
          );
      }
    } catch (error) {
      return msg.channel.send(`An error occurred: ${error.message}`);
    } finally {
      connection.release();
    }
  }
}

module.exports = Starboard;
