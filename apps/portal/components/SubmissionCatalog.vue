<script setup lang="ts">
import type { AchievementChallenge, Map, MapChallenge } from "../composables/useSubmissionUpload";

const props = defineProps<{ maps: Map[]; mapChallenges: MapChallenge[]; achievementChallenges: AchievementChallenge[]; selectedChallengeId: string }>();
const emit = defineEmits<{ select: [challengeId: string] }>();
const family = ref<"map" | "achievement">("map");
const selectedMapId = ref("");
const selectedCategory = ref("");

const mapCards = computed(() => props.mapChallenges.filter((challenge) => !selectedMapId.value || challenge.mapId === selectedMapId.value));
const achievementCategories = computed(() => [...new Set(props.achievementChallenges.map((challenge) => challenge.category))]);
const filteredAchievements = computed(() => props.achievementChallenges.filter((challenge) => !selectedCategory.value || challenge.category === selectedCategory.value));
</script>

<template>
  <div class="catalog">
    <div class="segmented" role="tablist" aria-label="挑战类型">
      <button class="segment" :class="{ active: family === 'map' }" :aria-selected="family === 'map'" role="tab" type="button" @click="family = 'map'">地图通关 <span>{{ mapChallenges.length }}</span></button>
      <button class="segment" :class="{ active: family === 'achievement' }" :aria-selected="family === 'achievement'" role="tab" type="button" @click="family = 'achievement'">成就挑战 <span>{{ achievementChallenges.length }}</span></button>
    </div>

    <section v-if="family === 'map'" class="catalog-section" aria-labelledby="map-catalog-title">
      <div class="catalog-heading"><p class="eyebrow">始终可提交</p><h2 id="map-catalog-title">选择地图难度</h2></div>
      <label class="filter-field">选择地图<select v-model="selectedMapId" aria-label="按地图筛选"><option value="">全部地图</option><option v-for="map in maps" :key="map.mapId" :value="map.mapId">{{ map.mapName }}</option></select></label>
      <div v-if="mapCards.length" class="challenge-grid">
        <button v-for="challenge in mapCards" :key="challenge.challengeId" class="challenge-card" :class="{ selected: selectedChallengeId === challenge.challengeId }" type="button" @pointerdown="emit('select', challenge.challengeId)" @click="emit('select', challenge.challengeId)">
          <span class="card-kicker">{{ challenge.mapName }}</span><strong>{{ challenge.name }}</strong><span>{{ challenge.difficulty ?? '地图通关' }}</span>
        </button>
      </div>
      <p v-else class="empty-state">没有匹配的地图通关目标。</p>
    </section>

    <section v-else class="catalog-section" aria-labelledby="achievement-catalog-title">
      <div class="catalog-heading"><p class="eyebrow">公开证据规则</p><h2 id="achievement-catalog-title">选择成就目标</h2></div>
      <label class="filter-field">选择分类<select v-model="selectedCategory" aria-label="按成就分类筛选"><option value="">全部分类</option><option v-for="category in achievementCategories" :key="category" :value="category">{{ category }}</option></select></label>
      <div v-if="filteredAchievements.length" class="challenge-grid">
        <button v-for="challenge in filteredAchievements" :key="challenge.challengeId" class="challenge-card" :class="{ selected: selectedChallengeId === challenge.challengeId }" type="button" @pointerdown="emit('select', challenge.challengeId)" @click="emit('select', challenge.challengeId)">
          <span class="card-kicker">{{ challenge.category }}</span><strong>挑战称号：{{ challenge.titleName }}</strong><span>{{ challenge.condition }}</span>
        </button>
      </div>
      <p v-else class="empty-state">当前没有带明确证据规则的可提交成就挑战。地图通关仍可正常提交。</p>
    </section>
  </div>
</template>

<style scoped>
.catalog { display: grid; gap: 24px; min-width: 0; }
.segmented { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 4px; border: 1px solid var(--line); border-radius: 13px; background: var(--surface-raised); }
.segment { min-height: 40px; border: 0; border-radius: 9px; color: var(--muted); background: transparent; font: inherit; font-size: .88rem; cursor: pointer; transition: color .16s ease, background .16s ease; }
.segment span { color: var(--quiet); font-size: .76rem; }
.segment.active { color: var(--text); background: var(--surface); box-shadow: 0 1px 3px rgb(0 0 0 / 10%); }
.catalog-section { display: grid; gap: 16px; }
.catalog-heading { display: grid; gap: 6px; }.catalog-heading .eyebrow { margin: 0; }.catalog-heading h2 { margin: 0; color: var(--text); font-size: 1.35rem; letter-spacing: -.04em; }
.filter-field { display: grid; gap: 7px; color: var(--muted); font-size: .82rem; }.filter-field select { min-height: 42px; padding: 0 12px; border: 1px solid var(--line); border-radius: 10px; color: var(--text); background: var(--surface-raised); font: inherit; }.filter-field select:focus { border-color: var(--line-strong); outline: 2px solid var(--accent-surface); outline-offset: 1px; }
.challenge-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; max-height: min(65vh, 620px); overflow: auto; padding: 2px; }
.challenge-card { display: grid; align-content: start; gap: 7px; min-height: 108px; padding: 14px; border: 1px solid var(--line); border-radius: 12px; text-align: left; color: var(--muted); background: var(--surface); font: inherit; cursor: pointer; transition: border-color .16s ease, background .16s ease, transform .16s ease; }.challenge-card strong { color: var(--text); font-size: .95rem; }.challenge-card span:last-child { font-size: .8rem; line-height: 1.45; }.challenge-card:hover, .challenge-card:focus-visible { border-color: var(--line-strong); }.challenge-card:active { transform: scale(.985); }.challenge-card.selected { border-color: var(--accent); background: var(--accent-surface); }.card-kicker { color: var(--quiet); font-size: .74rem; }.empty-state { margin: 0; padding: 18px; border: 1px dashed var(--line-strong); border-radius: 12px; color: var(--muted); line-height: 1.6; }
@media (prefers-reduced-motion: reduce) { .segment, .challenge-card { transition: none; }.challenge-card:active { transform: none; } }
</style>
