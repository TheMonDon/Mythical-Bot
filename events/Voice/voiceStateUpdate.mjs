import { EmbedBuilder } from 'discord.js';

export async function run(client, oldState, newState) {
  const botVoiceChannel = newState.guild.members.me.voice.channel;
  if (!botVoiceChannel) return; // Bot not in VC

  const player = client.lavalink.players.get(newState.guild.id);
  if (!player) return;

  const settings = client.getSettings(newState.guild);
  const guildId = newState.guild.id;

  // Check if someone LEFT the bot's VC
  if (oldState.channelId === botVoiceChannel.id && oldState.channelId !== newState.channelId) {
    const nonBotMembers = botVoiceChannel.members.filter((m) => !m.user.bot);

    if (nonBotMembers.size === 0 && !player.paused) {
      // Start 10s timeout to pause
      const timeout = setTimeout(async () => {
        if (!player.playing && !player.queue.tracks?.length) return;

        const updatedMembers = botVoiceChannel.members.filter((m) => !m.user.bot);

        if (updatedMembers.size === 0) {
          await player.pause();
          player.autoPaused = true;

          const embed = new EmbedBuilder()
            .setColor(settings.embedErrorColor)
            .setDescription(
              `Playback paused in <#${botVoiceChannel.id}> because the voice channel stayed empty for 10 seconds.`,
            )
            .setTimestamp();

          player.textChannelId &&
            client.channels.cache
              .get(player.textChannelId)
              ?.send({ embeds: [embed] })
              .catch(() => {});
        }

        client.pauseTimeouts.delete(guildId);
      }, 10_000);

      // Store timeout so we can cancel it
      client.pauseTimeouts.set(guildId, timeout);
    }
  }

  // Check if someone JOINED the bot's VC
  if (newState.channelId === botVoiceChannel.id && oldState.channelId !== newState.channelId) {
    if (client.pauseTimeouts.has(guildId)) {
      clearTimeout(client.pauseTimeouts.get(guildId));
      client.pauseTimeouts.delete(guildId);
    }

    const nonBotMembers = botVoiceChannel.members.filter((m) => !m.user.bot);

    if (nonBotMembers.size > 0 && player.paused && player.autoPaused) {
      await player.resume();
      player.autoPaused = false;

      const embed = new EmbedBuilder()
        .setColor(settings.embedSuccessColor)
        .setDescription(`Playback resumed in <#${botVoiceChannel.id}>.`)
        .setTimestamp();

      player.textChannelId &&
        client.channels.cache
          .get(player.textChannelId)
          ?.send({ embeds: [embed] })
          .catch(() => {});
    }
  }
}
