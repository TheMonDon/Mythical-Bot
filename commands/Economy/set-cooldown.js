const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');

class SetCooldown extends Command {
  constructor(client) {
    super(client, {
      name: 'set-cooldown',
      category: 'Economy',
      description: 'Set the cooldown of economy commands',
      longDescription: 'Minimum cooldown is 30 seconds. \nMaximum cooldown is 2 weeks.',
      usage: 'set-cooldown <work | rob | crime | slut | chat> <cooldown>',
      aliases: ['setcooldown'],
      examples: ['set-cooldown work 30 seconds', 'set-cooldown work 2 weeks'],
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();
    const types = ['rob', 'work', 'crime', 'slut', 'chat'];

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    const { parseMS } = await import('human-ms');

    if (!args || args.length < 1) {
      // Defaults
      const defaultCooldowns = {
        work: 300,
        rob: 600,
        crime: 600,
        slut: 600,
        chat: 60,
      };

      // Get the cooldowns from the database
      const [rows] = await connection.execute(
        /* sql */
        `
          SELECT
            cooldown_name,
            duration
          FROM
            cooldown_settings
          WHERE
            server_id = ?
        `,
        [msg.guild.id],
      );

      // Convert DB results into lookup
      const dbCooldowns = {};
      for (const row of rows) {
        dbCooldowns[row.cooldown_name] = row.duration;
      }

      // Merge with defaults
      const cooldowns = {};
      for (const [name, defVal] of Object.entries(defaultCooldowns)) {
        cooldowns[name] = dbCooldowns[name] ?? defVal;
      }

      embed.setColor(msg.settings.embedColor).setDescription(stripIndents`
        The current cooldowns are set to: 
  
        \`Work\`   - ${parseMS(cooldowns.work * 1000)}
        \`Rob\`    - ${parseMS(cooldowns.rob * 1000)}
        \`Crime\`  - ${parseMS(cooldowns.crime * 1000)}
        \`Slut\`   - ${parseMS(cooldowns.slut * 1000)}
        \`Chat\`   - ${parseMS(cooldowns.chat * 1000)}
  
        Usage: \`${msg.settings.prefix + this.help.usage}\`
        Examples: ${this.help.examples.map((a) => `\`${a}\``).join('\n')}

      `);

      connection.release();
      return msg.channel.send({ embeds: [embed] });
    }

    const type = args[0].toLowerCase();
    if (!types.includes(type)) {
      connection.release();
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }

    args.shift();
    const time = args.join(' ');
    const parse = (await import('parse-duration')).default;
    const cooldown = parse(time);
    const properCase = this.client.util.toProperCase(type);

    if (isNaN(cooldown)) {
      connection.release();
      return this.client.util.errorEmbed(msg, 'Please provide a valid cooldown time.', 'Invalid Cooldown');
    }

    if (cooldown > 1209600000) {
      connection.release();
      return this.client.util.errorEmbed(msg, "Cooldowns can't be longer than 2 weeks.", 'Invalid Cooldown');
    } else if (cooldown < 30000) {
      connection.release();
      return this.client.util.errorEmbed(msg, "Cooldowns can't be shorter than 30 seconds.", 'Invalid Cooldown');
    }

    const duration = cooldown / 1000;
    await connection.execute(
      /* sql */ `
        INSERT INTO
          cooldown_settings (guild_id, cooldown_name, duration)
        VALUES
          (?, ?, ?) ON DUPLICATE KEY
        UPDATE duration =
        VALUES
          (duration)
      `,
      [msg.guild.id, type, duration],
    );

    embed.setDescription(`The cooldown of \`${properCase}\` has been set to ${parseMS(cooldown)}.`);

    connection.release();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetCooldown;
