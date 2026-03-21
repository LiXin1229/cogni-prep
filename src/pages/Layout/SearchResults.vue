<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import { useUserInfoStore } from '@/stores/user'

const searchStore = useSearchStore()
const userStore = useUserInfoStore()
const router = useRouter()

defineProps<{
  keyword: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const expandedPath = ref<string | null>(null)

const toggleExpand = (path: string) => {
  expandedPath.value = expandedPath.value === path ? null : path
}

const navToEditorFile = (fileNode: any) => {
  router.push({ name: '编辑器' })
  searchStore.selectFileFromSearch(fileNode)
  if (userStore.isMobile) {
    emit('close')
  }
}

const handleResultClick = (result: any) => {
  console.log(result)
  toggleExpand(result.fileNode.path)
  navToEditorFile(result.fileNode)
}

const handleMatchClick = (fileNode: any, matchIndex: number) => {
  router.push({ name: '编辑器' })
  searchStore.selectMatch(fileNode, matchIndex)
  if (userStore.isMobile) {
    emit('close')
  }
}
</script>

<template>
  <div class="search-results">
    <div v-if="searchStore.currentFileTree === null" class="empty-tip">
      {{
        searchStore.fileTreeSource === 'online'
          ? '请先在编辑器中选择线上目录'
          : '请先在编辑器中打开本地目录'
      }}
    </div>
    <div v-else-if="searchStore.isSearching" class="loading-tip">搜索中...</div>
    <div v-else-if="keyword && !searchStore.results.length" class="empty-tip">未找到匹配的文件</div>
    <div v-else class="result-list">
      <div
        v-for="result in searchStore.results"
        :key="result.fileNode.path"
        class="result-item"
        @click="handleResultClick(result)"
      >
        <div class="file-info">
          <div class="file-name">{{ result.fileNode.name }}</div>
          <div class="file-path">{{ result.fileNode.path }}</div>
          <div v-if="expandedPath === result.fileNode.path" class="matches">
            <div
              v-for="(match, idx) in result.matches"
              :key="idx"
              class="match-item"
              @click.stop="handleMatchClick(result.fileNode, idx)"
            >
              {{ match.context }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.search-results {
  margin-top: 10px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;

  .empty-tip,
  .loading-tip {
    padding: 20px 10px;
    text-align: center;
    color: var(--text-color-4);
    font-size: 13px;
  }

  .result-list {
    .result-item {
      display: flex;
      align-items: center;
      padding: 8px 10px;
      margin: 4px 0;
      border-radius: 8px;
      cursor: pointer;

      .file-info {
        flex: 1;
        min-width: 0;

        .file-name {
          font-size: 14px;
          color: var(--text-color-1);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          &:hover {
            color: var(--main-color);
          }
        }

        .file-path {
          font-size: 11px;
          color: var(--text-color-4);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }

        .matches {
          margin-top: 8px;
          border-left: 2px solid var(--light-border-color-2);

          .match-item {
            font-size: 12px;
            color: var(--text-color-2);
            line-height: 1.5;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 4px 0;
            padding-left: 16px;
            position: relative;

            &:hover {
              color: var(--main-color);
            }

            &::before {
              content: '';
              position: absolute;
              left: 6px;
              top: 50%;
              transform: translateY(-50%);
              width: 4px;
              height: 4px;
              border-radius: 50%;
              background-color: var(--light-border-color-2);
            }
          }
        }
      }
    }
  }

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c188;
    border-radius: 3px;
  }
}
</style>
