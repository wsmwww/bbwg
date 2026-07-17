<template>
<!-- Fullscreen Canvas -->
    <canvas id="layoutCanvas"></canvas>
    <div id="shortcutToast" class="shortcut-toast"></div>
    <div id="eraserCursor" class="eraser-cursor" aria-hidden="true">
        <span class="material-symbols-outlined">ink_eraser</span>
    </div>
    <button id="returnHomeButton" type="button" @click="emit('back-to-series')" title="返回地图系列">
        <span aria-hidden="true">‹</span>
        <span>返回地图系列</span>
    </button>

    <aside id="powerRankingPanel" aria-label="战力排名">
        <div class="power-ranking-card">
            <div class="power-ranking-head">
                <div>
                    <p>POWER RANK</p>
                    <h2>成员战力榜</h2>
                </div>
                <button id="refreshPowerRankingButton" type="button" title="重新读取成员数据">刷新</button>
            </div>
            <div class="power-ranking-actions">
                <button id="importPowerRankingButton" type="button">导入</button>
                <button id="editPowerRankingButton" type="button">编辑</button>
                <button id="exportPowerRankingJsonButton" type="button">导出JSON</button>
                <button id="exportPowerRankingExcelButton" type="button">导出Excel</button>
                <input id="powerRankingFileInput" type="file" accept=".json,.xlsx,.xls,.csv,.txt" hidden />
            </div>
            <div class="power-ranking-summary">
                <span id="powerRankingCount">0 人</span>
                <span id="powerRankingTotal">总战力 0</span>
            </div>
            <div class="power-ranking-tabs" role="tablist" aria-label="盟友列表范围">
                <button id="powerRankingAllTab" type="button" data-power-scope="all" aria-pressed="true">全联盟</button>
                <button id="powerRankingRosterTab" type="button" data-power-scope="roster" aria-pressed="false">参战人员</button>
            </div>
            <div class="power-ranking-search">
                <label for="powerRankingNameInput">名称搜索</label>
                <input id="powerRankingNameInput" type="text" placeholder="输入成员名称关键字" />
            </div>
            <div class="power-ranking-filter">
                <div>
                    <label for="powerRankingMinInput">最低战力</label>
                    <input id="powerRankingMinInput" type="text" inputmode="decimal" placeholder="例如 1亿" />
                </div>
                <div>
                    <label for="powerRankingMaxInput">最高战力</label>
                    <input id="powerRankingMaxInput" type="text" inputmode="decimal" placeholder="例如 5亿" />
                </div>
                <button id="clearPowerRankingFilterButton" type="button">清空</button>
            </div>
            <div id="powerRankingStatus" class="power-ranking-status">正在读取战力排名...</div>
            <ol id="powerRankingList" class="power-ranking-list"></ol>
        </div>
    </aside>

    <div id="powerRankingEditorModal" class="power-ranking-modal hidden" role="dialog" aria-modal="true" aria-labelledby="powerRankingEditorTitle">
        <div class="power-ranking-modal__panel">
            <div class="power-ranking-modal__head">
                <div>
                    <p>MEMBER DATA</p>
                    <h2 id="powerRankingEditorTitle">手动编辑成员</h2>
                </div>
                <button id="closePowerRankingEditorButton" type="button" aria-label="关闭">×</button>
            </div>
            <p class="power-ranking-modal__hint">每行一个成员，格式：排名,名称,战力,联盟,职位。也可以直接粘贴 JSON 数组。</p>
            <textarea id="powerRankingEditorText" spellcheck="false"></textarea>
            <div class="power-ranking-modal__footer">
                <button id="resetPowerRankingEditorButton" type="button">填入当前数据</button>
                <button id="savePowerRankingEditorButton" type="button">应用并保存</button>
            </div>
        </div>
    </div>
    
    <!-- Top Controls -->
    <div id="topControls"
        class="fixed top-4 left-0 right-0 z-40 pointer-events-none flex justify-center">
        <!-- Wrapper-->
        <div class="px-4">
            <!-- White Card -->
            <div class="bg-white shadow-lg rounded-lg pointer-events-auto">
                <div class="flex items-center px-4 py-3 gap-4">
                    <!-- Controls Group -->
                    <div id="toolbar-controls" class="flex items-center gap-2 flex-wrap md:flex-nowrap">
                        <button data-type="select" aria-keyshortcuts="Q" title="选择 (Q)" class="shortcut-button bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex-none min-w-max md:min-w-0 leading-5"><span>选择</span><span class="shortcut-hint" aria-hidden="true">Q</span></button>
                        <button data-type="move" aria-keyshortcuts="W" title="平移 (W)" class="shortcut-button bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex-none min-w-max md:min-w-0 leading-5"><span>平移</span><span class="shortcut-hint" aria-hidden="true">W</span></button>
                        <button id="deleteButton" data-type="delete" aria-keyshortcuts="E" title="删除选中；未选中时进入擦除模式 (E)" class="shortcut-button bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex-none min-w-max md:min-w-0 leading-5"><span>删除</span><span class="shortcut-hint" aria-hidden="true">E</span></button>
                        <button id="clearButton"   class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex-none min-w-max md:min-w-0 leading-5">清空</button>
                        <button id="undoButton" aria-keyshortcuts="Control+Z,Meta+Z" title="撤销 (Ctrl/Cmd+Z)" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium flex-none min-w-max md:min-w-0 leading-5" disabled>撤销</button>
                        <button id="redoButton" aria-keyshortcuts="Control+Y,Meta+Y,Control+Shift+Z,Meta+Shift+Z" title="重做 (Ctrl/Cmd+Y 或 Ctrl/Cmd+Shift+Z)" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium flex-none min-w-max md:min-w-0 leading-5" disabled>重做</button>
                    </div>

                    <div class="h-8 w-px bg-gray-300 hidden md:block"></div>

                    <!-- Zoom Controls (hidden on mobile) -->
                    <div class="hidden md:flex items-center gap-2">
                        <button id="zoomOutBtn" class="h-9 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-base leading-none font-bold">−</button>
                        <span id="zoomLevel" class="w-12 text-sm font-medium text-center select-none">100%</span>
                        <button id="zoomInBtn"  class="h-9 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-base leading-none font-bold">+</button>
                        <button id="resetZoomBtn" class="h-9 px-3 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium">重置</button>
                        <button id="centerBtn"    class="h-9 px-3 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium">居中</button>

                    </div>
                </div>
                <div class="hidden md:flex items-center justify-center gap-2 border-t border-gray-200 px-4 py-2 text-xs text-gray-600">
                    <span><kbd class="rounded border border-gray-300 bg-gray-100 px-1 py-0.5 font-semibold">Q</kbd> 选择</span>
                    <span><kbd class="rounded border border-gray-300 bg-gray-100 px-1 py-0.5 font-semibold">W</kbd> 平移</span>
                    <span><kbd class="rounded border border-gray-300 bg-gray-100 px-1 py-0.5 font-semibold">E</kbd> 删除/擦除</span>
                    <span><kbd class="rounded border border-gray-300 bg-gray-100 px-1 py-0.5 font-semibold">1-6</kbd> 建筑</span>
                    <span><kbd class="rounded border border-gray-300 bg-gray-100 px-1 py-0.5 font-semibold">A</kbd> 联盟</span>
                    <span><kbd class="rounded border border-gray-300 bg-gray-100 px-1 py-0.5 font-semibold">M</kbd> 模式</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Right Sidebar -->
    <div id="rightSidebar" class="fixed right-0 top-0 h-full bg-white shadow-lg z-50 flex flex-col border-l border-gray-200" style="width: 320px;">
        <!-- Main Content Area -->
        <div class="flex flex-col h-full">
            <!-- Top Section with Map Name -->
            <div class="p-4 border-b">
                <input id="mapNameInput" type="text" placeholder="地图名称（可选）" 
                       class="w-full p-3 border-2 border-gray-300 rounded-lg text-center focus:border-blue-500 focus:outline-none" maxlength="30">
                <div id="mapNameHint" class="text-center text-red-500 text-sm mt-1 hidden"></div>
                <div class="mt-3 planner-map-mode">
                    <span class="text-sm font-medium">模式 (M):</span>
                    <div class="mt-1 flex w-full items-center rounded-lg border border-gray-200 bg-gray-100 p-1" role="group" aria-label="地图模式切换">
                        <button type="button" data-mode="base" aria-keyshortcuts="M" aria-pressed="true" class="flex-1 px-3 py-1 text-center text-xs font-medium rounded-md bg-blue-500 text-white shadow-sm transition-colors">基地</button>
                        <button type="button" data-mode="castle" aria-keyshortcuts="M" aria-pressed="false" class="flex-1 px-3 py-1 text-center text-xs font-medium rounded-md bg-transparent text-gray-500 hover:text-gray-700 transition-colors">王城</button>
                    </div>
                </div>
                <div class="mt-2 planner-alliance-mode">
                    <span class="text-sm font-medium">联盟 (A):</span>
                    <div class="alliance-switch mt-1" role="group" aria-label="联盟切换">
                        <button type="button" data-alliance="main" aria-keyshortcuts="A" aria-pressed="true">主盟</button>
                        <button type="button" data-alliance="farm" aria-keyshortcuts="A" aria-pressed="false">分盟</button>
                        <button type="button" data-alliance="blue" aria-keyshortcuts="A" aria-pressed="false">蓝盟</button>
                        <button type="button" data-alliance="red" aria-keyshortcuts="A" aria-pressed="false">红盟</button>
                        <button type="button" data-alliance="purple" aria-keyshortcuts="A" aria-pressed="false">紫盟</button>
                        <button type="button" data-alliance="orange" aria-keyshortcuts="A" aria-pressed="false">橙盟</button>
                    </div>
                </div>
                    <div id="marchtimeHint" class="mt-2 text-center text-xs text-gray-600 px-3 hidden">
                    提示：在 <strong>王城</strong> 模式下，行军时间按 25% 行军速度加成计算（不含宠物，含设施）。
                    </div>
            </div>

            <!-- Middle Section with Buildings and Cities -->
            <section id="swordTaskPanel" class="sword-task-panel" aria-label="神剑任务列表">
                <div class="sword-legion-switch" role="group" aria-label="神剑战场军团切换">
                    <button type="button" data-sword-legion="legion1" aria-pressed="true">军团1</button>
                    <button type="button" data-sword-legion="legion2" aria-pressed="false">军团2</button>
                </div>
                <div class="sword-roster-summary">
                    <span id="swordRosterCount">报名 0 人</span>
                    <button id="openSwordRosterButton" type="button">参战报名</button>
                </div>
                <div class="sword-task-head">
                    <div>
                        <p>SWORD TASKS</p>
                        <h2>任务列表</h2>
                    </div>
                    <div class="sword-task-head__actions">
                        <button id="openSwordTaskDrawerButton" type="button">任务总览</button>
                        <button id="importSwordTaskPlanButton" type="button">导入安排</button>
                        <button id="exportSwordTaskPlanButton" type="button">导出安排</button>
                        <button id="addSwordTaskButton" type="button">新增任务</button>
                        <input id="swordTaskPlanFileInput" type="file" accept=".xlsx,.xls,.json,.csv,.txt" hidden />
                    </div>
                </div>
                <div class="sword-task-create">
                    <input id="newSwordTaskNameInput" type="text" placeholder="例如：进攻神剑祭坛 / 防守四号护院" maxlength="24" />
                </div>
                <div id="swordTaskList" class="sword-task-list"></div>
                <p class="sword-task-hint">成员可加入多个任务；成员数据来自左侧联盟成员列表。</p>
            </section>

            <div id="swordAssignModal" class="sword-modal hidden" role="dialog" aria-modal="true" aria-labelledby="swordAssignTitle">
                <div class="sword-modal__panel">
                    <div class="sword-modal__head">
                        <div>
                            <p>ASSIGN MEMBERS</p>
                            <h2 id="swordAssignTitle">人员派遣</h2>
                        </div>
                        <button id="closeSwordAssignModalButton" type="button" aria-label="关闭">×</button>
                    </div>
                    <div class="sword-modal__tools">
                        <input id="swordAssignSearchInput" type="text" placeholder="搜索联盟成员" />
                    </div>
                    <div id="swordAssignMemberList" class="sword-assign-list"></div>
                </div>
            </div>

            <div id="swordRosterModal" class="sword-modal hidden" role="dialog" aria-modal="true" aria-labelledby="swordRosterTitle">
                <div class="sword-modal__panel">
                    <div class="sword-modal__head">
                        <div>
                            <p>BATTLE ROSTER</p>
                            <h2 id="swordRosterTitle">参战人员报名</h2>
                        </div>
                        <button id="closeSwordRosterModalButton" type="button" aria-label="关闭">×</button>
                    </div>
                    <div class="sword-modal__tools sword-roster-tools">
                        <input id="swordRosterSearchInput" type="text" placeholder="搜索联盟成员" />
                        <div>
                            <button id="selectFilteredSwordRosterButton" type="button">选择当前筛选</button>
                            <button id="clearSwordRosterButton" type="button">清空报名</button>
                        </div>
                    </div>
                    <div id="swordRosterMemberList" class="sword-assign-list"></div>
                </div>
            </div>

            <div id="swordTaskDrawerModal" class="sword-modal hidden" role="dialog" aria-modal="true" aria-labelledby="swordTaskDrawerTitle">
                <div class="sword-modal__panel sword-modal__panel--wide">
                    <div class="sword-modal__head">
                        <div>
                            <p>TASK OVERVIEW</p>
                            <h2 id="swordTaskDrawerTitle">神剑任务总览</h2>
                        </div>
                        <button id="closeSwordTaskDrawerButton" type="button" aria-label="关闭">×</button>
                    </div>
                    <div id="swordTaskDrawerList" class="sword-task-drawer-list"></div>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto planner-standard-panel">
                <!-- Buildings Section -->
                <div class="border-b">
                    <button data-section="buildings" class="w-full px-4 py-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100">
                        <span class="font-medium">建筑</span>
                        <span class="transform transition-transform" id="buildingsArrow">▼</span>
                    </button>
                    <div id="buildingsSection" class="p-4">
                        <div id="toolbar-buildings" class="grid grid-cols-2 gap-2 mb-4">
                            <button data-type="flag" aria-keyshortcuts="1" title="旗帜 (1)" class="shortcut-button bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium"><span>旗帜</span><span class="shortcut-hint" aria-hidden="true">1</span></button>
                            <button data-type="city" aria-keyshortcuts="2" title="城市 (2)" class="shortcut-button bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium"><span>城市</span><span class="shortcut-hint" aria-hidden="true">2</span></button>
                            <button data-type="building" aria-keyshortcuts="3" title="捕兽夹 (3)" class="shortcut-button bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium"><span>捕兽夹</span><span class="shortcut-hint" aria-hidden="true">3</span></button>
                            <button data-type="hq" aria-keyshortcuts="4" title="总部 (4)" class="shortcut-button bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium"><span>总部</span><span class="shortcut-hint" aria-hidden="true">4</span></button>
                            <button data-type="node" aria-keyshortcuts="5" title="节点 (5)" class="shortcut-button bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium"><span>节点</span><span class="shortcut-hint" aria-hidden="true">5</span></button>
                            <button data-type="obstacle" aria-keyshortcuts="6" title="障碍 (6)" class="shortcut-button bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium"><span>障碍</span><span class="shortcut-hint" aria-hidden="true">6</span></button>
                            <button data-type="dog" title="放置小狗轮廓" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium">小狗</button>
                            <button data-type="capybara" title="放置卡皮巴拉轮廓" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium">卡皮巴拉</button>
                            <button data-type="enemyzone" aria-keyshortcuts="7" title="敌方区域 (7，仅王城模式)" class="shortcut-button bg-gray-700 hover:bg-gray-800 text-white px-4 py-3 rounded-lg text-sm font-medium"><span>敌方区域</span><span class="shortcut-hint" aria-hidden="true">7</span></button>
                            <button type="button" data-action="sword-battlefield" title="一键生成神剑战场建筑点位" class="battlefield-template-button">神剑战场</button>
                            <button type="button" data-action="three-alliance-battlefield" title="一键生成三盟争霸点位与路线" class="battlefield-template-button">三盟争霸</button>
                            <button type="button" data-action="copy-three-alliance-layout" title="按参考图生成三盟争霸标准建筑和路线" class="battlefield-template-button">生成三盟</button>
                        </div>
                        <div class="obstacle-size-selector hidden mb-4">
                            <span class="text-sm font-medium">障碍大小：</span>
                            <div class="mt-1 flex w-full items-center rounded-lg border border-gray-200 bg-gray-100 p-1" role="group" aria-label="障碍大小">
                                <button type="button" data-obstacle-size="1" aria-pressed="true" class="flex-1 px-3 py-1 text-center text-xs font-medium rounded-md bg-blue-500 text-white shadow-sm transition-colors">1×1</button>
                                <button type="button" data-obstacle-size="2" aria-pressed="false" class="flex-1 px-3 py-1 text-center text-xs font-medium rounded-md bg-transparent text-gray-500 hover:text-gray-700 transition-colors">2×2</button>
                                <button type="button" data-obstacle-size="3" aria-pressed="false" class="flex-1 px-3 py-1 text-center text-xs font-medium rounded-md bg-transparent text-gray-500 hover:text-gray-700 transition-colors">3×3</button>
                                <button type="button" data-obstacle-size="4" aria-pressed="false" class="flex-1 px-3 py-1 text-center text-xs font-medium rounded-md bg-transparent text-gray-500 hover:text-gray-700 transition-colors">4×4</button>
                            </div>
                        </div>
                        <div class="text-sm p-3 bg-gray-100 rounded-lg text-center space-y-1">
                        <!-- Row 1 -->
                        <div class="flex justify-center space-x-2">
                            <span>旗帜： <span id="flagCounter" class="font-bold">0</span></span>
                            <span>城市： <span id="cityCounter" class="font-bold">0</span></span>
                            <span>捕兽夹： <span id="buildingCounter" class="font-bold">0/2</span></span>
                        </div>

                        <!-- Row 2 -->
                        <div class="flex justify-center space-x-2">
                            <span>总部：<span id="hqCounter" class="font-bold">0</span></span>
                            <span>节点： <span id="nodeCounter" class="font-bold">0</span></span>
                        </div>
                        </div>
                    </div>
                </div>

                <!-- Cities Section -->
                <div class="border-b">
                    <button data-section="cities" class="w-full px-4 py-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100">
                        <span class="font-medium">城市</span>
                        <span class="transform transition-transform" id="citiesArrow">▼</span>
                    </button>
                    <div id="citiesSection" class="flex-1 overflow-hidden flex flex-col">
                        <div class="p-4 border-b">
                            <!-- Additional settings -->
                            <div id="citySettingsButtons" class="flex justify-end gap-2 mb-3">
                                <!-- P1 = Clock toggle: toggles march times visibility on the canvas -->
                                <button citySettingsButtons="1" id="toggleMarchtime" title="显示/隐藏城市行军时间" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">
                                    <span>行军</span>
                                </button>
                                <!-- P2 = Wavemode toggle: toggles wave mode visibility on the canvas -->
                                 <button citySettingsButtons="2" title="显示/隐藏波次模式" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">
                                    <span>波次</span>
                                </button>

                                <!-- P3 = Toggle coordinates -->
                                <button citySettingsButtons="3" title="显示/隐藏坐标" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">
                                    <span>坐标</span>
                                </button>
                                
                                <!-- P6 = Toggle worldmap obstacle layer -->
                                <button citySettingsButtons="6" title="显示/隐藏地形障碍" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">
                                    <span>地形</span>
                                </button>
                                
                                <!-- P4 = Import Players -->
                                <button citySettingsButtons="4" title="导入城市CSV：name,x,y,alliance,team" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">
                                    <span>导入城市</span>
                                    <input type="file" id="playersCsvInput" accept=".csv,text/csv" class="hidden" />
                                </button>
                                <!-- P5 = Show Teams in Base -->
                                <button citySettingsButtons="5" title="基地模式显示队伍" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 hidden">
                                    <span>队伍</span>
                                </button>
                            </div>

                            <div id="anchorInputContainer" class="hidden mt-2 flex justify-end gap-2">
                                <input id="anchorInput" type="text" placeholder="x:y" 
                                        class="w-24 p-1 border rounded text-sm" />
                                <button id="setAnchorBtn" class="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                                    设置
                                </button>
                            </div>

                            <!-- Team Management Section -->
                            <div id="teamManagementSection" class="mb-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-sm font-medium">队伍</span>
                                    <button id="createNewTeamBtn" class="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded">+ 新建队伍</button>
                                </div>
                                <div id="teamsContainer" class="space-y-1">
                                    <!-- Teams will be populated by JS -->
                                </div>
                            </div>

                            <div id="selectedEntityEditor" class="selected-entity-editor hidden">
                                <div class="selected-entity-editor__head">
                                    <span>选中方块文字</span>
                                    <small id="selectedEntityMeta">未选择</small>
                                </div>
                                <input id="selectedEntityNameInput" type="text" maxlength="40" placeholder="输入方块上的文字" />
                                <div class="entity-mark-editor">
                                    <button id="markSelectedEntityButton" type="button">重点标记</button>
                                    <button id="unmarkSelectedEntityButton" type="button">取消标记</button>
                                </div>
                                <div id="trapCalibrationPanel" class="trap-calibration-panel hidden">
                                    <label for="trapCalibrationInput">捕兽夹坐标校准</label>
                                    <div>
                                        <input id="trapCalibrationInput" type="text" placeholder="例如 612:588" />
                                        <button id="trapCalibrationButton" type="button">校准</button>
                                    </div>
                                    <p>输入游戏里这个捕兽夹的坐标后，周边城市坐标会自动对齐。</p>
                                </div>
                            </div>

                            <div class="selected-entity-editor three-alliance-builder">
                                <div class="selected-entity-editor__head">
                                    <span>三盟建筑</span>
                                    <small>点击后新增到地图中心</small>
                                </div>
                                <div class="three-alliance-builder__grid">
                                    <button type="button" data-three-alliance-add="threeRuin">遗迹</button>
                                    <button type="button" data-three-alliance-add="threeRuinGroup">遗迹群</button>
                                    <button type="button" data-three-alliance-add="threeSeaPillar">海之柱</button>
                                    <button type="button" data-three-alliance-add="threeCamp">戍卫兵营</button>
                                    <button type="button" data-three-alliance-add="threeTransferHub">中转枢纽</button>
                                    <button type="button" data-three-alliance-add="threeTideTemple">潮汐神殿</button>
                                    <button type="button" data-three-alliance-optimize>对齐优化</button>
                                </div>
                                <p>新增后可拖动位置，再选中两个建筑进行连线。</p>
                            </div>

                            <div class="selected-entity-editor connection-editor">
                                <div class="selected-entity-editor__head">
                                    <span>线路编辑</span>
                                    <small>选中两个建筑后操作</small>
                                </div>
                                <div class="connection-editor__actions">
                                    <button id="connectSelectedEntitiesButton" type="button">连接选中</button>
                                    <button id="disconnectSelectedEntitiesButton" type="button">取消连线</button>
                                </div>
                                <div id="connectionColorPalette" class="connection-editor__palette" aria-label="线路颜色">
                                    <button type="button" data-line-color="blue" aria-pressed="true">蓝线</button>
                                    <button type="button" data-line-color="gold" aria-pressed="false">金线</button>
                                    <button type="button" data-line-color="red" aria-pressed="false">红线</button>
                                </div>
                                <p>建筑移动后线路会跟随；新增、删除、染色和重点标记都会保存到短链接。</p>
                            </div>

                            <div class="flex items-center gap-2">
                                <label for="citySort" class="text-sm font-medium">排序：</label>
                                <select id="citySort" class="flex-1 text-sm border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none">
                                     <option value="team">队伍</option>
                                    <option value="name">名称</option>
                                </select>
                            </div>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4">
                            <ul id="cityList" class="space-y-2"></ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Bottom Section with Actions and Help -->
                <!-- Actions Section -->
                <div>
                    <button data-bottom="actions" class="w-full px-4 py-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100">
                        <span class="font-medium">操作</span>
                        <span class="transform transition-transform" id="actionsArrow">▼</span>
                    </button>
                    <div id="actionsSection" class="p-4 hidden">
                        <div class="space-y-2">
                            <button id="downloadButton" class="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-medium">保存为 PNG</button>
                            <button id="saveButton" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium">保存方案文件</button>
                            <button id="openMapFileButton" type="button" @click="openMapPlanFile" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium">打开方案文件</button>
                            <button id="saveAsCSVButton" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium">保存为 CSV</button>
                            <button id="shareButton" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium">复制链接</button>
                            <button id="shortUrlButton" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium">生成短链接</button>
                            <textarea id="mapData" rows="3" placeholder="地图代码..." 
                                      class="w-full p-3 border-2 border-gray-300 rounded-lg text-sm resize-none focus:border-blue-500 focus:outline-none"></textarea>
                            <button id="loadButton" class="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-3 rounded-lg text-sm font-medium">加载</button>
                            
                            <div id="shortUrlContainer" class="mt-2 hidden">
                                <input id="shortUrlOutput" type="text" readonly class="w-full p-3 border-2 border-gray-300 rounded-lg text-sm mb-2" />
                                <button id="copyShortUrlButton" class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium">复制</button>
                                <span id="shortUrlError" class="text-red-500 text-sm ml-2"></span>
                            </div>
                            <div id="copyMessage" class="hidden text-green-500 font-medium text-sm text-center">已复制！</div>
                        </div>
                    </div>
                </div>
            <div class="border-t mt-auto">
                <!-- Help Section -->
                <div class="border-b">
                    <button data-bottom="help" class="w-full px-4 py-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100">
                        <span class="font-medium">帮助</span>
                        <span class="transform transition-transform" id="helpArrow">▼</span>
                    </button>
                    <div id="helpSection" class="p-4 hidden">
                        <div class="text-sm space-y-3">
                            <div>
                                <p class="font-semibold text-blue-600 mb-2">放置对象</p>
                                <p class="ml-2 text-gray-700">• 从工具栏选择对象类型</p>
                                <p class="ml-2 text-gray-700">• 在网格上点击放置</p>
                            </div>
                            <div>
                                <p class="font-semibold text-green-600 mb-2">选择与移动</p>
                                <p class="ml-2 text-gray-700">• 选择“选择”后点击对象</p>
                                <p class="ml-2 text-gray-700">• Ctrl/Cmd + 点击可增减选中对象</p>
                                <p class="ml-2 text-gray-700">• 在空白处拖拽可框选</p>
                                <p class="ml-2 text-gray-700">• 拖动选中对象可整体移动</p>
                                <p class="ml-2 text-gray-700">• 直接输入可重命名城市</p>
                            </div>
                            <div>
                                <p class="font-semibold text-purple-600 mb-2">导航</p>
                                <p class="ml-2 text-gray-700">• 选择“平移”后拖动地图</p>
                                <p class="ml-2 text-gray-700">• 双指缩放（移动端）</p>
                                <p class="ml-2 text-gray-700">• 鼠标滚轮：缩放（桌面端）</p>
                                <p class="ml-2 text-gray-700">• 鼠标中键：平移（桌面端）</p>
                            </div>
                            <div>
                                <p class="font-semibold text-red-600 mb-2">删除</p>
                                <p class="ml-2 text-gray-700">• 选中对象时按 E：删除选中</p>
                                <p class="ml-2 text-gray-700">• 未选中时按 E：进入擦除模式，点击对象删除</p>
                                <p class="ml-2 text-gray-700">• 删除键删除选中对象</p>
                            </div>
                            <div>
                                <p class="font-semibold text-amber-600 mb-2">快捷键</p>
                                <p class="ml-2 text-gray-700">• Q = 选择，W = 平移，E = 删除选中 / 擦除模式</p>
                                <p class="ml-2 text-gray-700">• 1-6 = 旗帜、城市、捕兽夹、总部、节点、障碍</p>
                                <p class="ml-2 text-gray-700">• 7 = 敌方区域（王城模式）</p>
                                <p class="ml-2 text-gray-700">• M = 切换基地/王城模式</p>
                                <p class="ml-2 text-gray-700">• A = 切换主盟/分盟</p>
                                <p class="ml-2 text-gray-700">• Ctrl/Cmd+Z = 撤销，Ctrl/Cmd+Y = 重做</p>
                            </div>
                            <div class="mt-4 pt-3 border-t border-gray-200">
                                <p class="text-sm text-gray-500 text-center">
                                    原作者： 
                                    <a href="https://github.com/GFXSpeed" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">
                                        师夷长技以制夷
                                    </a>
                                </p>
                                <p class="text-sm text-gray-500 text-center">
                                    队伍功能：
                                    <a href="https://github.com/danelsgit" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">
                                        dkanelka
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Mobile Bottom Navigation -->
    <div id="mobileNav" class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div class="flex justify-around">
            <button data-mobile="buildings" class="flex-1 p-4 text-center">
                <span class="block text-sm">建筑</span>
            </button>
            <button data-mobile="cities" class="flex-1 p-4 text-center">
                <span class="block text-sm">城市</span>
            </button>
            <button data-mobile="actions" class="flex-1 p-4 text-center">
                <span class="block text-sm">操作</span>
            </button>
            <button data-mobile="help" class="flex-1 p-4 text-center">
                <span class="block text-sm">帮助</span>
            </button>
        </div>
    </div>

    <!-- Team Modal -->
    <div id="teamModal" class="fixed inset-0 hidden items-center justify-center bg-black/40 z-50">
        <div class="bg-white rounded-lg shadow-lg w-[90vw] max-w-sm p-4">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold">创建队伍</h3>
                <button id="teamModalClose" class="text-gray-500 hover:text-gray-700 text-lg leading-none" aria-label="关闭">×</button>
            </div>
            <div class="space-y-3">
                <div>
                    <label for="teamNameInput" class="block text-xs font-medium text-gray-600 mb-1">队伍名称</label>
                    <input id="teamNameInput" type="text" class="w-full border p-2 rounded text-sm" placeholder="队伍名称" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">颜色</label>
                    <div class="flex items-center gap-2">
                        <input id="teamColorInput" type="color" class="h-9 w-12 p-0 border rounded" />
                        <input id="teamColorHex" type="text" class="flex-1 border p-2 rounded text-sm" placeholder="#3B82F6" />
                    </div>
                </div>
            </div>
            <div class="mt-4 flex justify-end gap-2">
                <button id="teamModalCancel" class="px-3 py-2 text-xs rounded bg-gray-100 hover:bg-gray-200">取消</button>
                <button id="teamModalSave" class="px-3 py-2 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white">保存</button>
            </div>
        </div>
    </div>

    <!-- Mobile Sliding Panels -->
    <div id="mobilePanels" class="md:hidden">
        <div id="mobileBuildings" class="mobile-panel">
            <div class="bg-white p-4">
                <h3 class="font-medium mb-4">建筑</h3>
                <!-- Building Controls -->
                <div id="mobile-toolbar-buildings" class="grid grid-cols-2 gap-2 mb-4">
                    <!-- Content will be synced with desktop version -->
                </div>
                <div class="obstacle-size-selector hidden mb-4">
                    <span class="text-sm font-medium">障碍大小：</span>
                    <div class="mt-1 flex w-full items-center rounded-lg border border-gray-200 bg-gray-100 p-1" role="group" aria-label="障碍大小（移动端）">
                        <button type="button" data-obstacle-size="1" aria-pressed="true" class="flex-1 px-3 py-1 text-center text-xs font-medium rounded-md bg-blue-500 text-white shadow-sm transition-colors">1×1</button>
                        <button type="button" data-obstacle-size="2" aria-pressed="false" class="flex-1 px-3 py-1 text-center text-xs font-medium rounded-md bg-transparent text-gray-500 hover:text-gray-700 transition-colors">2×2</button>
                        <button type="button" data-obstacle-size="3" aria-pressed="false" class="flex-1 px-3 py-1 text-center text-xs font-medium rounded-md bg-transparent text-gray-500 hover:text-gray-700 transition-colors">3×3</button>
                        <button type="button" data-obstacle-size="4" aria-pressed="false" class="flex-1 px-3 py-1 text-center text-xs font-medium rounded-md bg-transparent text-gray-500 hover:text-gray-700 transition-colors">4×4</button>
                    </div>
                </div>
                <div class="text-sm p-3 bg-gray-100 rounded-lg text-center">
                    <span>旗帜： <span id="mobileFlagCounter" class="font-bold">0</span></span>
                    <span class="mx-2">•</span>
                    <span>城市： <span id="mobileCityCounter" class="font-bold">0</span></span>
                    <span class="mx-2">•</span>
                    <span>捕兽夹： <span id="mobileBuildingCounter" class="font-bold">0/2</span></span>
                    <span class="mx-2">•</span>
                    <span>总部： <span id="mobileHqCounter" class="font-bold">0</span></span>
                    <span class="mx-2">•</span>
                    <span>节点： <span id="mobileNodeCounter" class="font-bold">0</span></span>
                </div>
            </div>
        </div>

        <div id="mobileCities" class="mobile-panel">
            <div class="bg-white p-4">
                <h3 class="font-medium mb-4">城市</h3>
                <div class="mb-3">
                    <span class="text-sm font-medium">模式 (M):</span>
                    <div class="mt-1 flex w-full items-center rounded-lg border border-gray-200 bg-gray-100 p-1" role="group" aria-label="移动端地图模式切换">
                        <button type="button" data-mode="castle" aria-keyshortcuts="M" aria-pressed="false" class="flex-1 px-3 py-1 text-center text-xs font-medium rounded-md bg-transparent text-gray-500 hover:text-gray-700 transition-colors">王城</button>
                        <button type="button" data-mode="base" aria-keyshortcuts="M" aria-pressed="true" class="flex-1 px-3 py-1 text-center text-xs font-medium rounded-md bg-blue-500 text-white shadow-sm transition-colors">基地</button>
                    </div>
                </div>
                <div class="mb-2">
                    <span class="text-sm font-medium">联盟 (A):</span>
                    <div class="alliance-switch mt-1" role="group" aria-label="移动端联盟切换">
                        <button type="button" data-alliance="main" aria-keyshortcuts="A" aria-pressed="true">主盟</button>
                        <button type="button" data-alliance="farm" aria-keyshortcuts="A" aria-pressed="false">分盟</button>
                        <button type="button" data-alliance="blue" aria-keyshortcuts="A" aria-pressed="false">蓝盟</button>
                        <button type="button" data-alliance="red" aria-keyshortcuts="A" aria-pressed="false">红盟</button>
                        <button type="button" data-alliance="purple" aria-keyshortcuts="A" aria-pressed="false">紫盟</button>
                        <button type="button" data-alliance="orange" aria-keyshortcuts="A" aria-pressed="false">橙盟</button>
                    </div>
                </div>
                <div id="mobileActiveAllianceTrapHint" class="mb-3 text-center text-xs text-gray-600">主盟捕兽夹： 0/2</div>
                <div id="mobileMarchtimeHint" class="mb-3 text-center text-xs text-gray-600 px-3 hidden">
                    提示：在 <strong>王城</strong> 模式下，行军时间按 25% 行军速度加成计算（不含宠物，含设施）。
                </div>
                <!-- Additional setttings -->
                <div id="mobileCitySettingsButtons" class="flex justify-end gap-2 mb-3">
                    <!-- P1 = Clock toggle: toggles march times visibility on the canvas -->
                    <button citySettingsButtons="m1" title="显示/隐藏行军时间" class="px-2 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200">
                        <span>行军</span>
                    </button>
                    
                    <!-- P2 = Wavemode toggle: toggles wave mode visibility on the canvas -->
                    <button citySettingsButtons="m2" title="显示/隐藏波次模式" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">
                        <span>波次</span>
                    </button>
                    
                    <!-- P3 = Toggle coordinates -->
                    <button citySettingsButtons="m3" title="显示/隐藏坐标" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">
                        <span>坐标</span>
                    </button>
                    
                    <!-- P4 = Import Players -->
                    <button citySettingsButtons="m4" title="导入城市CSV：name,x,y,alliance,team" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">
                        <span>导入城市</span>
                        <input type="file" id="mobilePlayersCsvInput" accept=".csv,text/csv" class="hidden" />
                    </button>                     
                    <!-- P5 = Show Teams in Base -->
                    <button citySettingsButtons="m5" title="基地模式显示队伍" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 hidden">
                        <span>队伍</span>
                    </button>
                    <!-- P6 = Toggle worldmap obstacle layer -->
                    <button citySettingsButtons="m6" title="显示/隐藏地形障碍" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">
                        <span>地形</span>
                    </button>
                </div>

                <div class="flex items-center gap-2 mb-4">
                    <label for="mobileCitySort" class="text-sm font-medium">排序：</label>
                    <select id="mobileCitySort" class="flex-1 text-sm border-2 border-gray-300 rounded-lg p-2">
                        <option value="team">队伍</option>
                        <option value="name">名称</option>
                    </select>
                </div>
                <div id="mobileTeamActions" class="mb-4 flex justify-end">
                    <button id="createNewTeamBtnMobile" class="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded">+ 新建队伍</button>
                </div>
                <ul id="mobileCityList" class="space-y-2">
                    <!-- Content will be synced with desktop version -->
                </ul>
            </div>
        </div>

        <div id="mobileActions" class="mobile-panel">
            <div class="bg-white p-4">
                <h3 class="font-medium mb-4">操作</h3>
                <div class="space-y-2">
                    <button id="mobileDownloadButton" class="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-medium">保存为 PNG</button>
                    <button id="mobileSaveButton" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium">保存方案文件</button>
                    <button id="mobileOpenMapFileButton" type="button" @click="openMapPlanFile" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium">打开方案文件</button>
                    <button id="mobileSaveAsCSVButton" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium">保存为 CSV</button>
                    <button id="mobileShareButton" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium">复制链接</button>
                    <button id="mobileShortUrlButton" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium">生成短链接</button>
                    <textarea id="mobileMapData" rows="3" placeholder="地图代码..." 
                              class="w-full p-3 border-2 border-gray-300 rounded-lg text-sm resize-none focus:border-blue-500 focus:outline-none"></textarea>
                    <button id="mobileLoadButton" class="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-3 rounded-lg text-sm font-medium">加载</button>
                    <div id="mobileShortUrlContainer" class="mt-2 hidden">
                        <input id="mobileShortUrlOutput" type="text" readonly class="w-full p-3 border-2 border-gray-300 rounded-lg text-sm mb-2" />
                        <button id="mobileCopyShortUrlButton" class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium">复制</button>
                        <span id="mobileShortUrlError" class="text-red-500 text-sm ml-2"></span>
                    </div>
                    <div id="mobileCopyMessage" class="hidden text-green-500 font-medium text-sm text-center">已复制！</div>
                </div>
            </div>
        </div>

        <div id="mobileHelp" class="mobile-panel">
            <div class="bg-white p-4">
                <!-- Copy of desktop help content -->
            </div>
        </div>
    </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted } from 'vue';
import * as XLSX from 'xlsx';
import * as fflate from 'fflate';
import './layout-planner/style.css';
import layoutPlannerScript from './layout-planner/script.js?raw';

const emit = defineEmits(['back-to-series']);
const props = defineProps({
  initialTemplate: {
    type: String,
    default: ''
  }
});

let plannerScriptEl = null;
let currentMapFileHandle = null;

function getNativeWindow() {
  try {
    if (window.top && window.top.location.origin === window.location.origin) {
      return window.top;
    }
  } catch {
    // Cross-origin or sandboxed access; fall back to the current window proxy.
  }
  return window;
}

function getSafeMapFileName(name) {
  const cleanName = String(name || '默认地图')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 40);
  return `${cleanName || '默认地图'}.bbmap.json`;
}

function downloadMapPlanFile(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getSafeMapFileName(payload.name);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function persistMapPlanFile(payload) {
  const fullPayload = {
    version: 1,
    app: 'benben-map-series',
    name: payload.name || '默认地图',
    code: payload.code,
    savedAt: new Date().toISOString()
  };

  const nativeWindow = getNativeWindow();
  const showSaveFilePicker = nativeWindow.showSaveFilePicker?.bind(nativeWindow);

  if (showSaveFilePicker) {
    try {
      if (!currentMapFileHandle) {
        currentMapFileHandle = await showSaveFilePicker({
          suggestedName: getSafeMapFileName(fullPayload.name),
          types: [
            {
              description: '奔奔王国地图方案',
              accept: { 'application/json': ['.json'] }
            }
          ]
        });
      }

      const writable = await currentMapFileHandle.createWritable();
      await writable.write(JSON.stringify(fullPayload, null, 2));
      await writable.close();
      return { mode: 'file-system-access' };
    } catch (error) {
      if (error?.name === 'AbortError') return { mode: 'cancelled' };
      console.warn('本地文件覆盖保存失败，已改为下载方案文件。', error);
      currentMapFileHandle = null;
    }
  }

  downloadMapPlanFile(fullPayload);
  return { mode: 'download' };
}

async function openMapPlanFile() {
  const file = await new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bbmap.json,.json,.txt';
    input.style.display = 'none';
    input.onchange = () => {
      const selectedFile = input.files?.[0] || null;
      input.remove();
      resolve(selectedFile);
    };
    document.body.appendChild(input);
    input.click();
  });

  if (!file) return;
  currentMapFileHandle = null;

  const text = await file.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { code: text.trim() };
  }

  const mapCode = payload?.code || payload?.mapData || '';
  if (!mapCode) {
    window.alert('方案文件里没有找到地图代码。');
    return;
  }

  const mapNameInput = document.getElementById('mapNameInput');
  const mapDataInput = document.getElementById('mapData');
  const mobileMapDataInput = document.getElementById('mobileMapData');
  if (payload?.name && mapNameInput) mapNameInput.value = payload.name;
  if (mapDataInput) mapDataInput.value = mapCode;
  if (mobileMapDataInput) mobileMapDataInput.value = mapCode;
  window.__layoutPlannerLoadMap?.();
}

function runLayoutPlannerScript() {
  const exposedScript = [
    '(function () {',
    '  const originalWindowAddEventListener = window.addEventListener.bind(window);',
    '  window.addEventListener = function(type, listener, options) {',
    "    if (type === 'DOMContentLoaded' && typeof listener === 'function') {",
    "      window.setTimeout(() => listener.call(window, new Event('DOMContentLoaded')), 0);",
    '      return;',
    '    }',
    '    return originalWindowAddEventListener(type, listener, options);',
    '  };',
    '  try {',
    layoutPlannerScript,
    "    window.__layoutPlannerHandleToolbarClick = typeof handleToolbarClick === 'function' ? handleToolbarClick : null;",
    "    window.__layoutPlannerLoadMap = typeof loadMap === 'function' ? loadMap : null;",
    "    window.__layoutPlannerPlaceSwordBattlefield = typeof placeSwordBattlefield === 'function' ? placeSwordBattlefield : null;",
    "    window.__layoutPlannerPlaceThreeAllianceBattlefield = typeof placeThreeAllianceBattlefield === 'function' ? placeThreeAllianceBattlefield : null;",
    "    window.__layoutPlannerSetMapMode = typeof setMapMode === 'function' ? setMapMode : null;",
    "    window.__layoutPlannerSetPowerRankingMembers = typeof setPowerRankingMembers === 'function' ? setPowerRankingMembers : null;",
    '  } finally {',
    '    window.addEventListener = originalWindowAddEventListener;',
    '  }',
    '})();'
  ].join('\n');

  plannerScriptEl = document.createElement('script');
  plannerScriptEl.dataset.layoutPlannerRuntime = 'true';
  plannerScriptEl.textContent = exposedScript;
  document.body.appendChild(plannerScriptEl);
}

function applyInitialTemplate() {
  window.setTimeout(() => {
    if (props.initialTemplate === 'sword-battlefield') {
      window.__layoutPlannerPlaceSwordBattlefield?.();
    } else if (props.initialTemplate === 'three-alliance-battlefield') {
      window.__layoutPlannerPlaceThreeAllianceBattlefield?.();
    } else if (props.initialTemplate === 'info-statistics-castle') {
      applyInfoStatisticsCastleTemplate();
    }
  }, 80);
}

function getInfoStatisticsPlannerMembers() {
  try {
    const rows = JSON.parse(localStorage.getItem('benben-info-statistics-rows') || '[]');
    if (!Array.isArray(rows)) return [];
    return rows
      .filter(row => String(row?.name || '').trim())
      .map((row, index) => ({
        rank: index + 1,
        name: String(row.name || '').trim(),
        power: Number(row.troops || row.diamonds || 0),
        uid: `info-${index + 1}-${String(row.name || '').trim()}`,
        role: row.castleLevel ? `城堡 Lv.${row.castleLevel}` : '',
        alliance: '信息统计',
        onlineTime: row.onlineTime,
        voice: row.voice,
        diamonds: row.diamonds,
        willingCost: row.willingCost,
        preference: row.preference,
        remark: row.remark
      }));
  } catch {
    return [];
  }
}

function applyInfoStatisticsCastleTemplate() {
  const members = getInfoStatisticsPlannerMembers();
  if (members.length) {
    window.__layoutPlannerSetPowerRankingMembers?.(members, {
      persist: true,
      source: '信息统计'
    });
  }
  window.__layoutPlannerSetMapMode?.('castle');
}

function installLayoutPlannerShell() {
  window.toggleSection = (section) => {
    const content = document.getElementById(section + 'Section');
    const arrow = document.getElementById(section + 'Arrow');
    if (!content || !arrow) return;
    content.classList.toggle('hidden');
    arrow.style.transform = content.classList.contains('hidden') ? 'rotate(180deg)' : '';
  };

  window.toggleBottomSection = (section) => {
    const content = document.getElementById(section + 'Section');
    const arrow = document.getElementById(section + 'Arrow');
    if (!content || !arrow) return;

    ['help', 'actions'].forEach((name) => {
      if (name === section) return;
      const otherContent = document.getElementById(name + 'Section');
      const otherArrow = document.getElementById(name + 'Arrow');
      otherContent?.classList.add('hidden');
      if (otherArrow) otherArrow.style.transform = 'rotate(180deg)';
    });

    content.classList.toggle('hidden');
    arrow.style.transform = content.classList.contains('hidden') ? 'rotate(180deg)' : '';
  };

  window.toggleMobileSection = (section) => {
    const targetId = `mobile${section.charAt(0).toUpperCase()}${section.slice(1)}`;
    document.querySelectorAll('.mobile-panel').forEach((panel) => {
      if (panel.id === targetId) {
        panel.style.display = 'block';
        window.setTimeout(() => panel.classList.toggle('active'), 10);
      } else {
        panel.classList.remove('active');
        window.setTimeout(() => {
          if (!panel.classList.contains('active')) panel.style.display = 'none';
        }, 300);
      }
    });
  };

  ['buildings', 'cities'].forEach((section) => {
    const content = document.getElementById(section + 'Section');
    const arrow = document.getElementById(section + 'Arrow');
    content?.classList.remove('hidden');
    if (arrow) arrow.style.transform = '';
  });

  const desktopToolbar = document.getElementById('toolbar-buildings');
  const mobileToolbar = document.getElementById('mobile-toolbar-buildings');
  if (desktopToolbar && mobileToolbar && !mobileToolbar.children.length) {
    Array.from(desktopToolbar.children).forEach((button) => {
      const clone = button.cloneNode(true);
      clone.addEventListener('click', (event) => window.__layoutPlannerHandleToolbarClick?.(event));
      mobileToolbar.appendChild(clone);
    });
  }

  const desktopHelp = document.getElementById('helpSection');
  const mobileHelpWrapper = document.getElementById('mobileHelp')?.querySelector('.bg-white');
  if (desktopHelp && mobileHelpWrapper) {
    while (mobileHelpWrapper.firstChild) mobileHelpWrapper.removeChild(mobileHelpWrapper.firstChild);
    const h3 = document.createElement('h3');
    h3.className = 'font-medium mb-4';
    h3.textContent = '帮助';
    mobileHelpWrapper.appendChild(h3);
    Array.from(desktopHelp.childNodes).forEach((node) => mobileHelpWrapper.appendChild(node.cloneNode(true)));
  }

  const resolveCurrentMode = (preferredMode) => {
    if (preferredMode === 'castle' || preferredMode === 'base') return preferredMode;
    const activeModeButton = document.querySelector('[data-mode][aria-pressed="true"]');
    return activeModeButton?.dataset?.mode || 'base';
  };
  const updateMarchtimeHint = (modeOverride) => {
    const mode = resolveCurrentMode(modeOverride);
    document.getElementById('marchtimeHint')?.classList.toggle('hidden', mode !== 'castle');
    document.getElementById('mobileMarchtimeHint')?.classList.toggle('hidden', mode !== 'castle');
  };
  updateMarchtimeHint();
  document.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => updateMarchtimeHint(btn.dataset.mode));
  });
  window.addEventListener('layout-mapmode-change', (event) => updateMarchtimeHint(event?.detail?.mode));

  document.querySelectorAll('[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => window.toggleSection(btn.dataset.section));
  });
  document.querySelectorAll('[data-bottom]').forEach((btn) => {
    btn.addEventListener('click', () => window.toggleBottomSection(btn.dataset.bottom));
  });
  document.querySelectorAll('[data-mobile]').forEach((btn) => {
    btn.addEventListener('click', () => window.toggleMobileSection(btn.dataset.mobile));
  });
}

onMounted(async () => {
  await nextTick();
  window.XLSX = XLSX;
  window.fflate = fflate;
  window.__layoutPlannerPersistMap = persistMapPlanFile;
  runLayoutPlannerScript();
  window.setTimeout(installLayoutPlannerShell, 0);
  applyInitialTemplate();
});

onBeforeUnmount(() => {
  plannerScriptEl?.remove();
  delete window.__layoutPlannerHandleToolbarClick;
  delete window.__layoutPlannerLoadMap;
  delete window.__layoutPlannerPlaceSwordBattlefield;
  delete window.__layoutPlannerPlaceThreeAllianceBattlefield;
  delete window.__layoutPlannerSetMapMode;
  delete window.__layoutPlannerSetPowerRankingMembers;
  delete window.__layoutPlannerPersistMap;
  delete window.XLSX;
  delete window.fflate;
  delete window.toggleSection;
  delete window.toggleBottomSection;
  delete window.toggleMobileSection;
});
</script>


