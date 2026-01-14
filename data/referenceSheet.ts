
import { ReferenceEntry } from '../types';

export const STATIC_REFERENCES: ReferenceEntry[] = [
  // --- C LAB MODE (Strict/Basic) ---
  {
    id: 'c-lab-printf',
    title: 'printf / Output',
    category: 'I/O',
    language: 'c',
    mode: 'lab',
    description: 'Standard output formatting.',
    code: `printf("Integer: %d\\n", 10);\nprintf("Float: %.2f\\n", 3.14);\nprintf("String: %s\\n", "Hello");`
  },
  {
    id: 'c-lab-scanf',
    title: 'scanf / Input',
    category: 'I/O',
    language: 'c',
    mode: 'lab',
    description: 'Standard input. Remember & for non-arrays.',
    code: `int x;\nscanf("%d", &x);\n\nchar str[50];\nscanf("%s", str); // No & for arrays`
  },
  {
    id: 'c-lab-malloc',
    title: 'Dynamic Memory (malloc)',
    category: 'Memory',
    language: 'c',
    mode: 'lab',
    description: 'Allocating memory on heap.',
    code: `int *arr = (int*)malloc(n * sizeof(int));\nif (arr == NULL) return -1;\n// Use arr...\nfree(arr);`
  },
  {
    id: 'c-lab-struct',
    title: 'Structure Definition',
    category: 'Data Types',
    language: 'c',
    mode: 'lab',
    description: 'Defining and using structs.',
    code: `struct Node {\n    int data;\n    struct Node* next;\n};\n\nstruct Node n1;\nn1.data = 10;`
  },
  {
    id: 'c-lab-file',
    title: 'File Operations',
    category: 'I/O',
    language: 'c',
    mode: 'lab',
    description: 'Reading and writing files.',
    code: `FILE *fptr;\nfptr = fopen("filename.txt", "w");\nif(fptr == NULL) exit(1);\nfprintf(fptr, "%d", num);\nfclose(fptr);`
  },

  // --- C++ LAB MODE (Strict/Basic) ---
  {
    id: 'cpp-lab-io',
    title: 'cin / cout',
    category: 'I/O',
    language: 'cpp',
    mode: 'lab',
    description: 'Stream based I/O.',
    code: `int x;\nstd::cin >> x;\nstd::cout << "Value: " << x << std::endl;`
  },
  {
    id: 'cpp-lab-vector',
    title: 'std::vector Basics',
    category: 'STL',
    language: 'cpp',
    mode: 'lab',
    description: 'Dynamic array usage.',
    code: `std::vector<int> v;\nv.push_back(10);\nv.pop_back();\nint sz = v.size();\nfor(int x : v) cout << x;`
  },
  {
    id: 'cpp-lab-class',
    title: 'Class Syntax',
    category: 'OOP',
    language: 'cpp',
    mode: 'lab',
    description: 'Basic class structure.',
    code: `class MyClass {\nprivate:\n    int x;\npublic:\n    MyClass(int val) : x(val) {}\n    int getX() { return x; }\n};`
  },

  // --- CASUAL MODE (Algorithms & DSA Patterns) ---
  // --- SORTING & SEARCHING ---
  {
    id: 'dsa-binary-search',
    title: 'Binary Search',
    category: 'Searching',
    language: 'both',
    mode: 'casual',
    description: 'O(log n) search on sorted array.',
    code: `int l = 0, r = n - 1;\nwhile (l <= r) {\n    int mid = l + (r - l) / 2;\n    if (arr[mid] == target) return mid;\n    if (arr[mid] < target) l = mid + 1;\n    else r = mid - 1;\n}`
  },
  {
    id: 'dsa-sort-custom',
    title: 'Custom Comparator Sort',
    category: 'Sorting',
    language: 'cpp',
    mode: 'casual',
    description: 'Sorting with lambda.',
    code: `sort(v.begin(), v.end(), [](const int& a, const int& b) {\n    return a > b; // Descending\n});`
  },
  
  // --- ARRAYS & TWO POINTERS ---
  {
    id: 'dsa-sliding-window',
    title: 'Sliding Window (Fixed)',
    category: 'Arrays',
    language: 'cpp',
    mode: 'casual',
    description: 'O(n) - Calculate sum of first k elements, then slide.',
    code: `int curr = 0;\nfor(int i=0; i<k; i++) curr += arr[i];\nint max_sum = curr;\nfor(int i=k; i<n; i++) {\n    curr += arr[i] - arr[i-k];\n    max_sum = max(max_sum, curr);\n}`
  },
  {
    id: 'dsa-two-pointers',
    title: 'Two Pointers (Reverse)',
    category: 'Arrays',
    language: 'both',
    mode: 'casual',
    description: 'Swapping elements from ends.',
    code: `int l = 0, r = n - 1;\nwhile(l < r) {\n    swap(arr[l], arr[r]);\n    l++; r--;\n}`
  },

  // --- GRAPH ALGORITHMS ---
  {
    id: 'dsa-bfs',
    title: 'BFS (Graph/Matrix)',
    category: 'Graph',
    language: 'cpp',
    mode: 'casual',
    description: 'Breadth-First Search using Queue.',
    code: `queue<int> q;\nq.push(start);\nvisited[start] = true;\n\nwhile (!q.empty()) {\n    int u = q.front(); q.pop();\n    for (int v : adj[u]) {\n        if (!visited[v]) {\n            visited[v] = true;\n            q.push(v);\n        }\n    }\n}`
  },
  {
    id: 'dsa-dfs',
    title: 'DFS (Recursive)',
    category: 'Graph',
    language: 'cpp',
    mode: 'casual',
    description: 'Depth-First Search recursion.',
    code: `void dfs(int u) {\n    visited[u] = true;\n    for (int v : adj[u]) {\n        if (!visited[v]) dfs(v);\n    }\n}`
  },
  {
    id: 'dsa-dijkstra',
    title: 'Dijkstra (Shortest Path)',
    category: 'Graph',
    language: 'cpp',
    mode: 'casual',
    description: 'O(E log V) shortest path with non-negative weights.',
    code: `priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;\ndist[src] = 0;\npq.push({0, src});\n\nwhile(!pq.empty()) {\n    int d = pq.top().first;\n    int u = pq.top().second;\n    pq.pop();\n    \n    if (d > dist[u]) continue;\n    for(auto& edge : adj[u]) {\n        int v = edge.first;\n        int weight = edge.second;\n        if (dist[u] + weight < dist[v]) {\n            dist[v] = dist[u] + weight;\n            pq.push({dist[v], v});\n        }\n    }\n}`
  },
  {
    id: 'dsa-union-find',
    title: 'Union Find (DSU)',
    category: 'Graph',
    language: 'cpp',
    mode: 'casual',
    description: 'Disjoint Set Union with Path Compression.',
    code: `int find(int i) {\n    if (parent[i] == i) return i;\n    return parent[i] = find(parent[i]);\n}\n\nvoid unionSets(int i, int j) {\n    int root_i = find(i);\n    int root_j = find(j);\n    if (root_i != root_j) parent[root_i] = root_j;\n}`
  },

  // --- DYNAMIC PROGRAMMING ---
  {
    id: 'dsa-knapsack',
    title: '0/1 Knapsack',
    category: 'DP',
    language: 'cpp',
    mode: 'casual',
    description: 'Standard DP for knapsack.',
    code: `for (int i = 0; i <= n; i++) {\n    for (int w = 0; w <= W; w++) {\n        if (i == 0 || w == 0) dp[i][w] = 0;\n        else if (wt[i-1] <= w)\n            dp[i][w] = max(val[i-1] + dp[i-1][w-wt[i-1]], dp[i-1][w]);\n        else\n            dp[i][w] = dp[i-1][w];\n    }\n}`
  },
  {
    id: 'dsa-lcs',
    title: 'Longest Common Subsequence',
    category: 'DP',
    language: 'cpp',
    mode: 'casual',
    description: 'LCS of two strings.',
    code: `for (int i = 1; i <= m; i++) {\n    for (int j = 1; j <= n; j++) {\n        if (X[i-1] == Y[j-1]) dp[i][j] = 1 + dp[i-1][j-1];\n        else dp[i][j] = max(dp[i-1][j], dp[i][j-1]);\n    }\n}`
  },

  // --- BIT MANIPULATION ---
  {
    id: 'dsa-bit-check',
    title: 'Check/Set/Unset K-th Bit',
    category: 'Bitmask',
    language: 'both',
    mode: 'casual',
    description: 'Basic bitwise operations.',
    code: `bool isSet = (n & (1 << k)) != 0;\nint setBit = n | (1 << k);\nint unsetBit = n & ~(1 << k);\nint toggleBit = n ^ (1 << k);`
  },
  {
    id: 'dsa-count-bits',
    title: 'Count Set Bits',
    category: 'Bitmask',
    language: 'cpp',
    mode: 'casual',
    description: 'Using built-in or Brian Kernighan.',
    code: `// Built-in GCC\nint count = __builtin_popcount(n);\n\n// Loop\nwhile (n > 0) {\n    n = n & (n - 1);\n    count++;\n}`
  },

  // --- STL & DATA STRUCTURES ---
  {
    id: 'dsa-map',
    title: 'Unordered Map (Frequency)',
    category: 'STL',
    language: 'cpp',
    mode: 'casual',
    description: 'Counting frequency of elements.',
    code: `unordered_map<int, int> freq;\nfor(int x : nums) freq[x]++;\n\nfor(auto it : freq) {\n    cout << it.first << ": " << it.second << endl;\n}`
  },
  {
    id: 'dsa-priority-queue',
    title: 'Min Heap (Priority Queue)',
    category: 'STL',
    language: 'cpp',
    mode: 'casual',
    description: 'Min-heap syntax.',
    code: `priority_queue<int, vector<int>, greater<int>> minHeap;\nminHeap.push(10);\nminHeap.push(5);\ncout << minHeap.top(); // 5`
  },
  
  // --- FAST I/O ---
  {
    id: 'dsa-fast-io',
    title: 'Fast I/O Template',
    category: 'I/O',
    language: 'cpp',
    mode: 'casual',
    description: 'Speed up cin/cout for competitive programming.',
    code: `ios_base::sync_with_stdio(false);\ncin.tie(NULL);`
  }
];
