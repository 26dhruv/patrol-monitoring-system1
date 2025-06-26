const AIScheduler = require('./services/aiScheduler');

async function testFrontendAI() {
  try {
    console.log('🧪 Testing AI Scheduler for Frontend...\n');
    
    const aiScheduler = new AIScheduler();

    // Test 1: Get scheduling stats
    console.log('📊 Testing getSchedulingStats...');
    const stats = await aiScheduler.getSchedulingStats();
    console.log('✅ Stats retrieved successfully');
    console.log('   - Total patrols:', stats.patrols?.total || 0);
    console.log('   - Active routes:', stats.routes?.total || 0);
    console.log('   - Available officers:', stats.officers?.available || 0);
    console.log('   - Open incidents:', stats.incidents?.open || 0);
    console.log('');

    // Test 2: Get recommendations
    console.log('📋 Testing getSchedulingRecommendations...');
    const recommendations = await aiScheduler.getSchedulingRecommendations();
    console.log('✅ Recommendations retrieved successfully');
    console.log('   - Number of recommendations:', recommendations.length);
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.type}: ${rec.message} (${rec.priority})`);
    });
    console.log('');

    // Test 3: Get optimization suggestions
    console.log('⚡ Testing getOptimizationSuggestions...');
    const suggestions = await aiScheduler.getOptimizationSuggestions();
    console.log('✅ Optimization suggestions retrieved successfully');
    console.log('   - Number of suggestions:', suggestions.length);
    suggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. ${suggestion.type}: ${suggestion.message} (${suggestion.priority})`);
    });
    console.log('');

    // Test 4: Generate assignments with basic parameters
    console.log('🤖 Testing generatePatrolAssignments...');
    const assignments = await aiScheduler.generatePatrolAssignments({
      maxRoutes: 3,
      startTime: new Date(),
      endTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
      createMissingRoutes: false
    });
    console.log('✅ Assignments generated successfully');
    console.log('   - Total assignments:', assignments.data.summary.totalAssignments);
    console.log('   - Routes created:', assignments.data.summary.routesCreated);
    console.log('   - Average score:', assignments.data.summary.averageScore.toFixed(2));
    console.log('');

    // Test 5: Generate assignments with route creation
    console.log('🆕 Testing generatePatrolAssignments with route creation...');
    const assignmentsWithRoutes = await aiScheduler.generatePatrolAssignments({
      maxRoutes: 5,
      startTime: new Date(),
      endTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
      createMissingRoutes: true
    });
    console.log('✅ Assignments with route creation generated successfully');
    console.log('   - Total assignments:', assignmentsWithRoutes.data.summary.totalAssignments);
    console.log('   - Routes created:', assignmentsWithRoutes.data.summary.routesCreated);
    console.log('   - Newly created routes:', assignmentsWithRoutes.data.newlyCreatedRoutes?.length || 0);
    console.log('');

    console.log('🎉 All frontend AI scheduler tests passed!');
    console.log('✅ The AI scheduler is ready for frontend integration.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testFrontendAI(); 